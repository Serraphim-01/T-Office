import axios from 'axios';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
import { diffChars } from 'diff';
import crypto from 'crypto';

// --- Helper Functions ---

function calculateHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const URGENCY_KEYWORDS = ["privacy", "gdpr", "data breach", "security", "terms of service", "confidentiality"];

function analyzeUrgency(diff) {
  let score = 0;
  diff.forEach(part => {
    if (part.added || part.removed) {
      const lowerCaseValue = part.value.toLowerCase();
      URGENCY_KEYWORDS.forEach(keyword => {
        if (lowerCaseValue.includes(keyword)) {
          score += 1;
        }
      });
    }
  });
  return score;
}


// --- Exported Functions ---

export async function getSites(pool) {
  const result = await pool.query('SELECT * FROM crawled_sites ORDER BY created_at DESC');
  return result.rows;
}

export async function addSite(pool, url) {
  const result = await pool.query('INSERT INTO crawled_sites (url) VALUES ($1) RETURNING *', [url]);
  return result.rows[0];
}

export async function deleteSite(pool, id) {
  await pool.query('DELETE FROM crawled_sites WHERE id = $1', [id]);
}

export async function getDocument(pool) {
  const result = await pool.query('SELECT content FROM compliance_documents ORDER BY created_at DESC LIMIT 1');
  return result.rows[0];
}

export async function updateDocument(pool, content) {
  // There should only ever be one document, so we update it.
  // The initial empty doc was created by the migration.
  const result = await pool.query('UPDATE compliance_documents SET content = $1 WHERE id = 1 RETURNING *', [content]);
  if (result.rowCount === 0) {
      // This is a fallback in case the initial document was deleted.
      const insertResult = await pool.query('INSERT INTO compliance_documents (content) VALUES ($1) RETURNING *', [content]);
      return insertResult.rows[0];
  }
  return result.rows[0];
}

export async function crawlSite(pool, siteId) {
    // 1. Get site URL and old hash
    const siteResult = await pool.query('SELECT * FROM crawled_sites WHERE id = $1', [siteId]);
    if (siteResult.rows.length === 0) {
        throw new Error('Site not found');
    }
    const site = siteResult.rows[0];

    // 2. Fetch website HTML
    let htmlContent;
    try {
        const response = await axios.get(site.url);
        htmlContent = response.data;
    } catch (error) {
        console.error(`Failed to fetch ${site.url}:`, error.message);
        throw new Error(`Failed to fetch URL: ${site.url}`);
    }

    // 3. Parse HTML and extract text
    const $ = cheerio.load(htmlContent);
    const mainContent = $('body').html(); // Simple approach: get the whole body
    const crawledText = htmlToText(mainContent, {
        wordwrap: 130
    });

    // 4. Calculate new hash
    const newHash = calculateHash(crawledText);

    // 5. Compare with old hash
    if (newHash === site.content_hash) {
        await pool.query('UPDATE crawled_sites SET last_crawled_at = NOW() WHERE id = $1', [siteId]);
        return { unchanged: true, message: 'Content has not changed since last crawl.' };
    }

    // 6. If changed, get master document and run diff
    const docResult = await getDocument(pool);
    const masterText = docResult.content || '';

    const differences = diffChars(masterText, crawledText);

    // 7. Analyze urgency
    const urgencyScore = analyzeUrgency(differences);

    // 8. Update database
    await pool.query(
        'UPDATE crawled_sites SET content_hash = $1, last_crawled_at = NOW() WHERE id = $2',
        [newHash, siteId]
    );

    // 9. Return results
    return {
        unchanged: false,
        diff: differences,
        urgencyScore: urgencyScore,
        crawledAt: new Date().toISOString()
    };
}
