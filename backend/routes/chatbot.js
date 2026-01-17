import express from "express";
import { authenticateJWT } from "./auth.js";

const router = express.Router();

// Helper function to analyze user question
function analyzeQuestion(question) {
  const lowerQuestion = question.toLowerCase();
  
  const patterns = {
    users: [/users|employees/i],
    attendance: [/attendance|clock/i],
    inventory: [/inventory|products|stock/i],
    wiki: [/wiki|training/i],
    hr: [/hr|human resources/i],
    system: [/help|departments/i]
  };

  for (const [category, categoryPatterns] of Object.entries(patterns)) {
    for (const pattern of categoryPatterns) {
      if (pattern.test(lowerQuestion)) {
        return { category, question: lowerQuestion };
      }
    }
  }
  return { category: 'system', question: lowerQuestion };
}

// Generate response based on database query
async function generateResponse(pool, analysis, userId) {
  const { category, question } = analysis;
  
  try {
    switch (category) {
      case 'users':
        if (/how many users|count of users|total users/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = true');
          return `There are ${result.rows[0].count} active users in the system.`;
        } else if (/users in (.+) department|(.+) department users/i.test(question)) {
          const match = question.match(/users in (.+) department|(.+) department users/i);
          const department = match[1] || match[2];
          const result = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE department ILIKE $1 AND active = true',
            [`%${department}%`]
          );
          return `There are ${result.rows[0].count} users in the ${department} department.`;
        } else {
          const result = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = true');
          return `There are ${result.rows[0].count} active users in the system. You can ask about specific departments or user details.`;
        }
        
      case 'attendance':
        if (/who clocked in today|today's attendance/i.test(question)) {
          const today = new Date().toISOString().split('T')[0];
          const result = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as count, 
                    ARRAY_AGG(DISTINCT u.full_name) as names 
             FROM attendance a 
             JOIN users u ON a.user_id = u.id 
             WHERE DATE(clock_in) = $1`,
            [today]
          );
          const count = result.rows[0].count;
          const names = result.rows[0].names;
          if (count > 0) {
            return `Today (${today}), ${count} users have clocked in: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} more` : ''}.`;
          } else {
            return `No users have clocked in today (${today}).`;
          }
        } else {
          const result = await pool.query('SELECT COUNT(*) as count FROM attendance');
          return `There are ${result.rows[0].count} attendance records in the system. You can ask about today's attendance.`;
        }
        
      case 'inventory':
        if (/products in inventory|inventory count/i.test(question)) {
          const productResult = await pool.query('SELECT COUNT(*) as count FROM products');
          const providerResult = await pool.query('SELECT COUNT(*) as count FROM providers');
          return `Inventory system has ${productResult.rows[0].count} products from ${providerResult.rows[0].count} providers.`;
        } else if (/providers|suppliers/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM providers');
          return `There are ${result.rows[0].count} providers/suppliers in the system.`;
        } else if (/inbound transactions|incoming stock/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM inbound_transactions');
          return `There are ${result.rows[0].count} inbound transactions recorded.`;
        } else if (/outbound transactions|outgoing stock/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM outbound_transactions');
          return `There are ${result.rows[0].count} outbound transactions recorded.`;
        } else {
          const productResult = await pool.query('SELECT COUNT(*) as count FROM products');
          const providerResult = await pool.query('SELECT COUNT(*) as count FROM providers');
          return `Inventory system has ${productResult.rows[0].count} products from ${providerResult.rows[0].count} providers.`;
        }
        
      case 'wiki':
        if (/(.+) department wiki|wiki for (.+)/i.test(question)) {
          const match = question.match(/(.+) department wiki|wiki for (.+)/i);
          const department = match[1] || match[2];
          const result = await pool.query(
            'SELECT COUNT(*) as count FROM wiki_topics WHERE department ILIKE $1',
            [`%${department}%`]
          );
          return `The ${department} department has ${result.rows[0].count} wiki topics available.`;
        } else {
          const result = await pool.query('SELECT COUNT(*) as count FROM wiki_topics');
          return `There are ${result.rows[0].count} wiki topics available for training and documentation.`;
        }
        
      case 'hr':
        if (/hr queries|employee queries/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM hr_queries');
          return `There are ${result.rows[0].count} HR queries in the system.`;
        } else if (/inductions|training sessions/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count FROM inductions');
          return `There are ${result.rows[0].count} induction/training sessions scheduled.`;
        } else {
          const result = await pool.query('SELECT COUNT(*) as count FROM hr_queries');
          return `There are ${result.rows[0].count} HR queries in the system.`;
        }
        
      case 'system':
        if (/departments|company structure/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count, ARRAY_AGG(name) as departments FROM departments');
          return `The system has ${result.rows[0].count} departments: ${result.rows[0].departments.join(', ')}.`;
        } else {
          return "I can help you with information about users, attendance, inventory, wiki topics, and HR queries. What would you like to know?";
        }
        
      default:
        return "I can help you with information about users, attendance, inventory, wiki topics, and HR queries. What would you like to know?";
    }
  } catch (err) {
    console.error('Error generating response:', err);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
}

// Chatbot endpoint
router.post("/ask", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { question, sessionId } = req.body;
  const userId = req.user.userId;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Analyze the question
    const analysis = analyzeQuestion(question);
    
    // Generate response from database
    const response = await generateResponse(pool, analysis, userId);
    
    // Save conversation to database
    await pool.query(
      `INSERT INTO chatbot_conversations (user_id, session_id, message, response, message_type, context)
       VALUES ($1, $2, $3, $4, 'user', $5)`,
      [userId, sessionId, question, response, JSON.stringify(analysis)]
    );

    res.json({
      question: question,
      answer: response,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get conversation history
router.get("/history/:sessionId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { sessionId } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT message, response, created_at
       FROM chatbot_conversations
       WHERE user_id = $1 AND session_id = $2
       ORDER BY created_at ASC
       LIMIT 20`,
      [userId, sessionId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching conversation history:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;