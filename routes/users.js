import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const fetchQuery = `
  SELECT id, name, email, created_at, profile_picture
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
router.post('/upload-profile-picture', authenticateToken, upload.single('profile_picture'), async (req, res) => {
  try {
    const userId = req.userId;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/${req.file.filename}`;

    const updateQuery = `
      UPDATE users
      SET profile_picture = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, profile_picture;
    `;

    const result = await query(updateQuery, [profilePictureUrl, userId]);
    const updatedUser = result.rows[0];

    return res.status(200).json({
      message: 'Profile picture updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;