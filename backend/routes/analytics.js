import express from 'express';
import { authenticateJWT } from './auth.js';

const router = express.Router();

// Get inventory analytics
router.get('/inventory', authenticateJWT, async (req, res) => {
  try {
    // Total inventory value
    const inventoryValueResult = await req.pool.query(`
      SELECT SUM(i.quantity * COALESCE(i.unit_price, p.default_unit_price, 0)) as total_value
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      WHERE i.status = 'Stored'
    `);
    
    // Inventory by category
    const inventoryByCategoryResult = await req.pool.query(`
      SELECT 
        p.product_type as name,
        COUNT(p.id) as count,
        SUM(i.quantity) as total_quantity,
        SUM(i.quantity * COALESCE(i.unit_price, p.default_unit_price, 0)) as total_value
      FROM products p
      JOIN inbound_transactions i ON p.id = i.product_id
      WHERE i.status = 'Stored'
      GROUP BY p.product_type
    `);
    
    // Low stock items (less than 10 units)
    const lowStockResult = await req.pool.query(`
      SELECT 
        p.name,
        SUM(i.quantity) as quantity
      FROM products p
      JOIN inbound_transactions i ON p.id = i.product_id
      WHERE i.status = 'Stored'
      GROUP BY p.id, p.name
      HAVING SUM(i.quantity) < 10
      ORDER BY quantity ASC
    `);
    
    res.json({
      total_inventory_value: parseFloat(inventoryValueResult.rows[0].total_value || 0),
      inventory_by_category: inventoryByCategoryResult.rows,
      low_stock_items: lowStockResult.rows
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get profit analytics for inbound goods
router.get('/profit', authenticateJWT, async (req, res) => {
  try {
    // Calculate profit from inbound to outbound transactions
    const profitResult = await req.pool.query(`
      SELECT 
        p.name as product_name,
        p.part_number,
        SUM(o.quantity) as total_sold,
        SUM(COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0) * o.quantity) as total_cost,
        SUM(COALESCE(o.outbound_price, 0) * o.quantity) as total_revenue,
        SUM((COALESCE(o.outbound_price, 0) - COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0)) * o.quantity) as total_profit,
        AVG(COALESCE(o.outbound_price, 0) - COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0)) as avg_profit_per_unit
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      GROUP BY p.id, p.name, p.part_number
      ORDER BY total_profit DESC
    `);
    
    // Overall profit summary
    const overallProfitResult = await req.pool.query(`
      SELECT 
        SUM((COALESCE(o.outbound_price, 0) - COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0)) * o.quantity) as total_profit,
        SUM(COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0) * o.quantity) as total_cost,
        SUM(COALESCE(o.outbound_price, 0) * o.quantity) as total_revenue,
        CASE 
          WHEN SUM(COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0) * o.quantity) > 0 
          THEN (SUM((COALESCE(o.outbound_price, 0) - COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0)) * o.quantity) / SUM(COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0) * o.quantity)) * 100
          ELSE 0
        END as profit_margin_percent
      FROM outbound_transactions o
      LEFT JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
    `);
    
    // Profit by month
    const profitByMonthResult = await req.pool.query(`
      SELECT 
        DATE_TRUNC('month', o.created_at) as month,
        SUM((COALESCE(o.outbound_price, 0) - COALESCE(o.inbound_price, i.unit_price, p.default_unit_price, 0)) * o.quantity) as monthly_profit,
        SUM(o.quantity) as total_units_sold
      FROM outbound_transactions o
      LEFT JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.status IN ('Delivered', 'Dispatched')
      GROUP BY DATE_TRUNC('month', o.created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    
    res.json({
      product_profit_details: profitResult.rows,
      overall_summary: overallProfitResult.rows[0],
      monthly_profit: profitByMonthResult.rows.map(row => ({
        ...row,
        month: row.month ? row.month.toISOString().split('T')[0] : null
      }))
    });
  } catch (error) {
    console.error('Error fetching profit analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get predictive analytics
router.get('/predictive', authenticateJWT, async (req, res) => {
  try {
    // Check if we have outbound transaction data to make predictions
    const hasOutboundData = await req.pool.query(`
      SELECT COUNT(*) as count FROM outbound_transactions 
      WHERE status IN ('Delivered', 'Dispatched')
      LIMIT 1
    `);
    
    if (parseInt(hasOutboundData.rows[0].count) === 0) {
      // If no outbound data, return placeholder response
      res.json({
        demand_predictions: [],
        revenue_prediction: {
          avg_monthly_revenue: 0,
          avg_monthly_growth_rate: 0,
          predicted_next_quarter_revenue: 0
        }
      });
      return;
    }
    
    // Predict demand based on recent sales
    const demandPredictionResult = await req.pool.query(`
      WITH recent_sales AS (
        SELECT 
          p.id,
          p.name,
          p.part_number,
          SUM(o.quantity) as total_sold,
          AVG(o.quantity) as avg_monthly_sales,
          COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) as months_active
        FROM products p
        JOIN inbound_transactions i ON p.id = i.product_id
        JOIN outbound_transactions o ON i.id = o.inbound_transaction_id
        WHERE o.status IN ('Delivered', 'Dispatched')
          AND o.created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY p.id, p.name, p.part_number
      ),
      current_inventory AS (
        SELECT 
          p.id,
          SUM(i.quantity) as current_stock
        FROM products p
        JOIN inbound_transactions i ON p.id = i.product_id
        WHERE i.status = 'Stored'
        GROUP BY p.id
      )
      SELECT 
        rs.name,
        rs.part_number,
        COALESCE(ci.current_stock, 0) as current_stock,
        ROUND(COALESCE(rs.avg_monthly_sales, 0), 2) as predicted_monthly_demand,
        CASE 
          WHEN COALESCE(rs.avg_monthly_sales, 0) > 0 
          THEN ROUND(COALESCE(ci.current_stock, 0) / rs.avg_monthly_sales, 1)
          ELSE NULL
        END as months_of_supply_left,
        CASE 
          WHEN COALESCE(ci.current_stock, 0) < (COALESCE(rs.avg_monthly_sales, 0) * 2) THEN 'Low Stock'
          WHEN COALESCE(ci.current_stock, 0) > (COALESCE(rs.avg_monthly_sales, 0) * 6) THEN 'High Stock'
          ELSE 'Normal'
        END as stock_status
      FROM recent_sales rs
      LEFT JOIN current_inventory ci ON rs.id = ci.id
      WHERE rs.months_active >= 2 -- Only include products sold for at least 2 months
      ORDER BY months_of_supply_left ASC NULLS LAST
    `);
    
    // Predict revenue for next quarter
    const revenuePredictionResult = await req.pool.query(`
      WITH monthly_revenue AS (
        SELECT 
          DATE_TRUNC('month', o.created_at) as month,
          SUM(COALESCE(o.outbound_price, 0) * o.quantity) as revenue
        FROM outbound_transactions o
        WHERE o.status IN ('Delivered', 'Dispatched')
          AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY month
      ),
      revenue_trend AS (
        SELECT 
          month,
          revenue,
          LAG(revenue, 1) OVER (ORDER BY month) as prev_month_revenue
        FROM monthly_revenue
      ),
      avg_growth AS (
        SELECT 
          AVG((revenue - COALESCE(prev_month_revenue, revenue)) / NULLIF(prev_month_revenue, 0)) as avg_monthly_growth_rate
        FROM revenue_trend
        WHERE prev_month_revenue IS NOT NULL
      )
      SELECT 
        (SELECT AVG(revenue) FROM monthly_revenue) as avg_monthly_revenue,
        (SELECT COALESCE(avg_monthly_growth_rate, 0) FROM avg_growth) as avg_monthly_growth_rate,
        (SELECT AVG(revenue) FROM monthly_revenue) * (1 + (SELECT COALESCE(avg_monthly_growth_rate, 0) FROM avg_growth)) * 3 as predicted_next_quarter_revenue
      FROM monthly_revenue
      LIMIT 1
    `);
    
    res.json({
      demand_predictions: demandPredictionResult.rows,
      revenue_prediction: revenuePredictionResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching predictive analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get user activity analytics (fallback if user_sessions table doesn't exist)
router.get('/user-activity', authenticateJWT, async (req, res) => {
  try {
    // Check if user_sessions table exists
    const tableCheck = await req.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      ) AS table_exists;
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      // If user_sessions table doesn't exist, return empty data
      res.json({
        daily_active_users: [],
        user_engagement_by_department: []
      });
      return;
    }
    
    // Daily active users in the last 30 days
    const dailyActiveUsersResult = await req.pool.query(`
      SELECT 
        DATE(login_time) as date,
        COUNT(DISTINCT user_id) as active_users
      FROM user_sessions
      WHERE login_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(login_time)
      ORDER BY date DESC
    `);
    
    // User engagement by department
    const userEngagementResult = await req.pool.query(`
      SELECT 
        u.department,
        COUNT(u.id) as total_users,
        COUNT(us.user_id) as active_users,
        ROUND((COUNT(us.user_id)::decimal / NULLIF(COUNT(u.id), 0)) * 100, 2) as engagement_rate
      FROM users u
      LEFT JOIN user_sessions us ON u.id = us.user_id AND us.login_time >= CURRENT_DATE - INTERVAL '7 days'
      WHERE u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY engagement_rate DESC
    `);
    
    res.json({
      daily_active_users: dailyActiveUsersResult.rows,
      user_engagement_by_department: userEngagementResult.rows
    });
  } catch (error) {
    console.error('Error fetching user activity analytics:', error);
    // If there's an error (like missing table), return empty data
    res.json({
      daily_active_users: [],
      user_engagement_by_department: []
    });
  }
});

export default router;