import express from "express";
import { authenticateJWT } from "./auth.js";
import { HfInference } from "@huggingface/inference";

const router = express.Router();
const hf = new HfInference(process.env.HUGGING_FACE_INFERENCE_API_KEY);

// Helper function to analyze user question
function analyzeQuestion(question) {
  const lowerQuestion = question.toLowerCase();
  
  const patterns = {
    users: [/users|employees/i],
    attendance: [/attendance|clock/i],
    inventory: [/inventory|products|stock/i],
    wiki: [/wiki|training/i],
    hr: [/hr|human resources/i],
    system: [/help|departments/i],
    analytics: [/analytics|report|compare|statistic|data|active.*vs.*unboarded|unboarded.*vs.*active/i]
  };

  for (const [category, categoryPatterns] of Object.entries(patterns)) {
    for (const pattern of categoryPatterns) {
      if (pattern.test(lowerQuestion)) {
        return { category, question: lowerQuestion };
      }
    }
  }
  return { category: 'general', question: lowerQuestion };
}

// Generate response based on database query for specific domains
async function generateDatabaseResponse(pool, analysis, userId) {
  const { category, question } = analysis;
  
  try {
    switch (category) {
      case 'users':
        if (/how many users|count of users|total users/i.test(question)) {
          const activeResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = true');
          const inactiveResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = false');
          const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
          
          return `There are ${activeResult.rows[0].count} active users and ${inactiveResult.rows[0].count} inactive users in the system (Total: ${totalResult.rows[0].count}).`;
        } else if (/users in (.+) department|(.+) department users/i.test(question)) {
          const match = question.match(/users in (.+) department|(.+) department users/i);
          const department = match[1] || match[2];
          const result = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE department ILIKE $1 AND active = true',
            [`%${department}%`]
          );
          return `There are ${result.rows[0].count} users in the ${department} department.`;
        } else {
          const activeResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = true');
          const inactiveResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = false');
          return `There are ${activeResult.rows[0].count} active users and ${inactiveResult.rows[0].count} inactive users in the system. You can ask about specific departments or user details.`;
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
        
      case 'analytics':
        if (/active.*vs.*unboarded|unboarded.*vs.*active|active users.*unboarded|unboarded.*active users|analytics.*user|user.*analytics/i.test(question)) {
          const activeResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = true');
          const inactiveResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE active = false');
          const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
          
          const activeCount = activeResult.rows[0].count;
          const inactiveCount = inactiveResult.rows[0].count;
          const totalCount = totalResult.rows[0].count;
          
          if (totalCount > 0) {
            const activePercentage = ((activeCount / totalCount) * 100).toFixed(1);
            const inactivePercentage = ((inactiveCount / totalCount) * 100).toFixed(1);
            
            return `📊 **User Analytics Report**

Active Users: ${activeCount} (${activePercentage}%)
Unboarded/Inactive Users: ${inactiveCount} (${inactivePercentage}%)
Total Users: ${totalCount}

This analytics shows the distribution of active vs unboarded users in the system.`;
          } else {
            return `📊 **User Analytics Report**

Total Users: ${totalCount}

There are currently no users in the system to analyze.`;
          }
        } else if (/analytics|report|compare|statistic|data/i.test(question)) {
          // Generic analytics response
          return "I can provide detailed analytics on various aspects of the system. Try asking about user analytics, attendance trends, or inventory reports.";
        }
        
      case 'system':
        if (/departments|company structure/i.test(question)) {
          const result = await pool.query('SELECT COUNT(*) as count, ARRAY_AGG(name) as departments FROM departments');
          return `The system has ${result.rows[0].count} departments: ${result.rows[0].departments.join(', ')}.`;
        } else {
          return "I can help you with information about users, attendance, inventory, wiki topics, and HR queries. What would you like to know?";
        }
        
      default:
        return null; // Return null to indicate that we should use the AI model
    }
  } catch (err) {
    console.error('Error generating database response:', err);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
}

// Generate AI-powered response using Hugging Face with Mistral model (using conversational API)
async function generateAIResponse(question, context = "") {
  try {
    // Use the conversational API which is appropriate for Mistral models
    const response = await hf.conversational({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      inputs: {
        text: `You are a helpful assistant for the T-Office system. Answer the user's question based on the context provided and general knowledge. Be friendly, informative, and diverse in your responses.\n\nContext: ${context || "No specific context provided"}\n\nQuestion: ${question}`,
      },
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.2,
      }
    });

    // Extract the generated text from the response
    let aiResponse = response?.generated_text || "I'm sorry, I couldn't generate a response for that question.";
    
    // Clean up the response to remove any extra parts
    if (aiResponse.includes("Question:")) {
      aiResponse = aiResponse.split("Question:")[1].trim();
    }
    
    // Remove any remaining special tokens
    aiResponse = aiResponse.replace(/<\/s>|<s>/g, '').trim();
    
    return aiResponse;
  } catch (error) {
    console.error('Error with Hugging Face API (Mistral):', error);
    
    // Fallback to a simpler approach if Mistral fails
    try {
      // Use text generation with a model that definitely supports it
      const response = await hf.textGeneration({
        model: "gpt2", // Using gpt2 as a reliable fallback that supports text generation
        inputs: `You are a helpful assistant for the T-Office system. Question: ${question}\nAnswer:`,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          return_full_text: false
        }
      });
      
      return response?.generated_text || "I'm here to assist you with the T-Office system. What would you like to know?";
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError);
      return "I'm having trouble connecting to my AI services right now. Could you rephrase your question? I can still help with specific questions about users, attendance, inventory, and other system features.";
    }
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
    
    let response;
    
    // First try to get a database-specific response for domain-specific questions
    const dbResponse = await generateDatabaseResponse(pool, analysis, userId);
    
    if (dbResponse && analysis.category !== 'general') {
      // If we have a database response for a specific domain, use it
      response = dbResponse;
    } else {
      // Otherwise, use the AI model for a more diverse response
      response = await generateAIResponse(question, dbResponse || "");
    }
    
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