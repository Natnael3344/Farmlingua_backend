import express from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const fetchQuery = `
      SELECT id, name, email, created_at, profile_picture
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const result = await query(fetchQuery, [userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload or update profile picture
router.post(
  '/upload-profile-picture',
  authenticateToken,
  upload.single('profile_picture'),
  async (req, res) => {
    try {
      const userId = req.userId;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get user's old profile picture
      const existingUser = await query(
        'SELECT profile_picture FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );

      if (existingUser.rows.length > 0 && existingUser.rows[0].profile_picture) {
        const oldPic = existingUser.rows[0].profile_picture;
        const oldFilePath = path.join(
          process.cwd(),
          'public',
          'user-content',
          path.basename(oldPic)
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Old profile picture deleted:', oldFilePath);
        }
      }

      // Generate new public URL
      const profilePictureUrl = `${req.protocol}://${req.get('host')}/user-content/${req.file.filename}`;

      // Update DB
      const updateQuery = `
        UPDATE users
        SET profile_picture = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, email, profile_picture;
      `;
      const result = await query(updateQuery, [profilePictureUrl, userId]);
      const updatedUser = result.rows[0];

      res.status(200).json({
        message: 'Profile picture updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
