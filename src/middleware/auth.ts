import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that verifies the user has an active Passport/Google OAuth session.
 * Replaces the old JWT bearer-token check.
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}
