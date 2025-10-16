import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const fetchQuery = `
      SELECT id, name, email, created_at 
      FROM users 
      WHERE id = $1 
      LIMIT 1
    `;
    
    const result = await query(fetchQuery, [userId]);
    const user = result.rows[0];

    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;