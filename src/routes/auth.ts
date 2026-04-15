import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import pool from '../config/db';
import { isAuthenticated } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// ── POST /auth/register — Local email/password registration ──────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Email is already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query<User>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, email, hashedPassword],
    );

    const user = result.rows[0];

    req.logIn(user, (err) => {
      if (err) {
        res.status(500).json({ error: 'Registration succeeded but login failed' });
        return;
      }
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/login — Local email/password login ────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await pool.query<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses Google sign-in. Please use the Google button.' });
      return;
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    req.logIn(user, (err) => {
      if (err) {
        res.status(500).json({ error: 'Login failed' });
        return;
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /auth/google — Kick off the OAuth flow ───────────────────────────────

router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// ── GET /auth/google/callback — Google redirects here after consent ──────────

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', (err: Error | null, user: User | false) => {
    if (err) {
      console.error('Google OAuth error:', err);
      res.status(500).json({ error: 'Authentication failed', details: err.message });
      return;
    }
    if (!user) {
      res.redirect('/auth/failure');
      return;
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Session login error:', loginErr);
        res.status(500).json({ error: 'Session creation failed', details: loginErr.message });
        return;
      }
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    });
  })(req, res, next);
});

// ── GET /auth/failure — OAuth failure landing ────────────────────────────────

router.get('/failure', (_req: Request, res: Response): void => {
  res.status(401).json({ error: 'Google authentication failed' });
});

// ── GET /auth/me — Return the currently logged-in user ──────────────────────

router.get('/me', isAuthenticated, (req: Request, res: Response): void => {
  const user = req.user as User;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    profilePicture: user.profile_picture,
  });
});

// ── POST /auth/logout — Destroy the session ──────────────────────────────────

router.post('/logout', (req: Request, res: Response): void => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
