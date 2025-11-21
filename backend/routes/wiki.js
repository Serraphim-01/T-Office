import express from "express";
import { authenticateJWT } from "./auth.js";

const router = express.Router();

// Get all departments
router.get("/departments", async (req, res) => {
  try {
    const result = await req.pool.query('SELECT name FROM departments ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (err) {
    console.error('Error fetching wiki departments:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all topics for a department
router.get("/:department/topics", async (req, res) => {
  const { department } = req.params;

  try {
    const result = await req.pool.query(
      'SELECT id, topic, content, created_at, updated_at FROM wiki_topics WHERE department = $1 ORDER BY topic',
      [department]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wiki topics:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific topic content
router.get("/:department/:topic", async (req, res) => {
  const { department, topic } = req.params;

  try {
    const result = await req.pool.query(
      'SELECT * FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const wikiTopic = result.rows[0];

    // Get questions for this topic
    const questionsResult = await req.pool.query(
      'SELECT id, question, options, correct_answer FROM wiki_questions WHERE topic_id = $1 ORDER BY id',
      [wikiTopic.id]
    );

    res.json({
      id: wikiTopic.id,
      department: wikiTopic.department,
      topic: wikiTopic.topic,
      content: wikiTopic.content,
      video_url: wikiTopic.video_url,
      questions: questionsResult.rows.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      })),
      created_by: wikiTopic.created_by,
      created_at: wikiTopic.created_at,
      updated_at: wikiTopic.updated_at
    });
  } catch (err) {
    console.error('Error fetching wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create or update topic content (Now available to all users)
// Removed requireAdmin middleware to allow all users access
router.put("/:department/:topic", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;
  const { content, questions } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  const client = await req.pool.connect();
  try {
    await client.query('BEGIN');

    // Insert or update the topic
    const result = await client.query(
      `INSERT INTO wiki_topics (department, topic, content, video_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (department, topic)
       DO UPDATE SET content = $3, video_url = $4, updated_at = NOW()
       RETURNING *`,
      [department, topic, content.trim(), req.body.video_url || null, req.user.userId]
    );

    const topicId = result.rows[0].id;

    // Delete existing questions for this topic
    await client.query('DELETE FROM wiki_questions WHERE topic_id = $1', [topicId]);

    // Insert new questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const question of questions) {
        if (question.question && question.options && question.correct_answer !== undefined) {
          await client.query(
            'INSERT INTO wiki_questions (topic_id, question, options, correct_answer) VALUES ($1, $2, $3, $4)',
            [topicId, question.question.trim(), JSON.stringify(question.options), question.correct_answer]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      id: result.rows[0].id,
      department: result.rows[0].department,
      topic: result.rows[0].topic,
      content: result.rows[0].content,
      created_by: result.rows[0].created_by,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Delete topic (Now available to all users)
// Removed requireAdmin middleware to allow all users access
router.delete("/:department/:topic", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    const result = await req.pool.query(
      'DELETE FROM wiki_topics WHERE department = $1 AND topic = $2 RETURNING *',
      [department, topic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error('Error deleting wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if user has completed a lesson
router.get("/:department/:topic/completion", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // First get the topic ID
    const topicResult = await req.pool.query(
      'SELECT id FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const topicId = topicResult.rows[0].id;

    // Check if user has completed this topic
    const completionResult = await req.pool.query(
      'SELECT id, completed_at FROM wiki_lesson_completions WHERE user_id = $1 AND topic_id = $2',
      [req.user.userId, topicId]
    );

    res.json({
      completed: completionResult.rows.length > 0,
      completed_at: completionResult.rows[0]?.completed_at || null
    });
  } catch (err) {
    console.error('Error checking lesson completion:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark lesson as completed
router.post("/:department/:topic/completion", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // First get the topic ID
    const topicResult = await req.pool.query(
      'SELECT id FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const topicId = topicResult.rows[0].id;

    // Insert completion record (ON CONFLICT DO NOTHING due to UNIQUE constraint)
    const result = await req.pool.query(
      'INSERT INTO wiki_lesson_completions (user_id, topic_id) VALUES ($1, $2) ON CONFLICT (user_id, topic_id) DO NOTHING RETURNING *',
      [req.user.userId, topicId]
    );

    res.json({
      completed: true,
      completed_at: result.rows[0]?.completed_at || new Date().toISOString(),
      was_already_completed: result.rows.length === 0
    });
  } catch (err) {
    console.error('Error marking lesson as completed:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get next lesson in department
router.get("/:department/:topic/next", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // Get all topics in the department ordered by topic name
    const topicsResult = await req.pool.query(
      'SELECT id, topic FROM wiki_topics WHERE department = $1 ORDER BY topic',
      [department]
    );

    if (topicsResult.rows.length === 0) {
      return res.json({ next_lesson: null });
    }

    // Find current topic index
    const currentIndex = topicsResult.rows.findIndex(t => t.topic === topic);

    if (currentIndex === -1) {
      return res.json({ next_lesson: null });
    }

    // Get next topic
    const nextIndex = currentIndex + 1;
    if (nextIndex >= topicsResult.rows.length) {
      // No more lessons in this department
      return res.json({ next_lesson: null });
    }

    const nextTopic = topicsResult.rows[nextIndex];

    res.json({
      next_lesson: {
        department: department,
        topic: nextTopic.topic,
        id: nextTopic.id
      }
    });
  } catch (err) {
    console.error('Error getting next lesson:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
