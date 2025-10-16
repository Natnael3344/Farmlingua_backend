import express from 'express';
import { query } from '../config/database.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { validateRegistration, validateLogin } from '../utils/validation.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const validation = validateRegistration(name, email, password);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const emailLower = email.toLowerCase();

    const checkQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
    const checkResult = await query(checkQuery, [emailLower]);
    const existingUser = checkResult.rows[0];

    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const insertQuery = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const insertResult = await query(insertQuery, [
      name.trim(),
      emailLower,
      passwordHash
    ]);
    const newUser = insertResult.rows[0];

    if (!newUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const token = generateToken(newUser.id);

    return res.status(201).json({
      token,
      userId: newUser.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') { 
        return res.status(400).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const validation = validateLogin(email, password);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    const emailLower = email.toLowerCase();

     const fetchQuery = 'SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1';
    const fetchResult = await query(fetchQuery, [emailLower]);
    const user = fetchResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      token,
      userId: user.id
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/social/google', async (req, res) => {
  try {
    const { token: googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: 'Google token required' });
    }

    return res.status(501).json({
      error: 'Google authentication not yet implemented',
      message: 'This endpoint is a stub for future implementation'
    });

  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase();

    const fetchQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
    const fetchResult = await query(fetchQuery, [emailLower]);
    const user = fetchResult.rows[0];

    if (!user) {
      console.log(`Password reset requested for non-existent email: ${emailLower}`);
    } else {
        
        console.log(`Sending password reset link to: ${emailLower}`);
    }

    return res.status(200).json({
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;