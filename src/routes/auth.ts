import { Router, Request, Response } from 'express';
import passport from 'passport';
import { isAuthenticated } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// ── GET /auth/google — Kick off the OAuth flow ───────────────────────────────

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// ── GET /auth/google/callback — Google redirects here after consent ──────────

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (_req: Request, res: Response): void => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  },
);

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
