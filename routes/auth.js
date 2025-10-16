import express from 'express';
import { query } from '../config/database.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';
import { validateRegistration, validateLogin } from '../utils/validation.js';
import { OAuth2Client } from 'google-auth-library'; 
import axios from 'axios';
const router = express.Router();
const GOOGLE_CLIENT_ID = "289922726253-q12k8ea9meb7jguh2s8jl9seb31rn9jl.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
async function verifyGoogleIdToken(token) {
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}
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
        // The client sends the 'idToken' in the request body
        const { idToken } = req.body; 

        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token required' });
        }

        // 1. Verify the ID Token with Google
        let payload;
        try {
            payload = await verifyGoogleIdToken(idToken);
        } catch (verificationError) {
            console.error('Google token verification failed:', verificationError.message);
            return res.status(401).json({ error: 'Invalid or expired Google token' });
        }

        const email = payload.email.toLowerCase();
        const name = payload.name;

        // 2. Check if user already exists in your database
        const checkQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
        const checkResult = await query(checkQuery, [email]);
        let user = checkResult.rows[0];
        
        let userId;

        if (user) {
            // User exists: Log them in
            userId = user.id;
        } else {
            // New user: Create a new user record
            console.log(`Creating new user for Google email: ${email}`);

            const insertQuery = `
                INSERT INTO users (name, email, password_hash, created_at)
                VALUES ($1, $2, NULL, NOW()) 
                RETURNING id
            `;
            const insertResult = await query(insertQuery, [
                name,
                email
            ]);

            if (!insertResult.rows[0]) {
                 return res.status(500).json({ error: 'Failed to create social user record' });
            }
            userId = insertResult.rows[0].id;
        }

        // 3. Generate and return your application's JWT
        const token = generateToken(userId);

        return res.status(200).json({
            token,
            userId
        });

    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/social/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Facebook access token required' });
    }

    // Verify token by calling Facebook Graph API
    const fbResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,email',
      },
    });

    const { id: facebookId, email, name } = fbResponse.data;

    // Validate response data
    if (!email) {
      return res.status(400).json({ error: 'Facebook account does not have an email' });
    }

    // Check if user exists by email
    const userQuery = 'SELECT id FROM users WHERE email = $1 LIMIT 1';
    const userResult = await query(userQuery, [email.toLowerCase()]);
    let user = userResult.rows[0];

    let userId;

    if (user) {
      userId = user.id;
    } else {
      // Create new user record, password_hash can be null for social users
      const insertUserQuery = `
        INSERT INTO users (name, email, password_hash, created_at)
        VALUES ($1, $2, NULL, NOW())
        RETURNING id
      `;
      const insertResult = await query(insertUserQuery, [name, email.toLowerCase(), facebookId, 'facebook']);

      if (!insertResult.rows[0]) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = insertResult.rows[0].id;
    }

    // Generate JWT token
    const token = generateToken(userId);

    return res.status(200).json({ token, userId });
  } catch (error) {
    console.error('Facebook auth error:', error);
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