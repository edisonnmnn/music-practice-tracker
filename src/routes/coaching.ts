import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../config/db';
import { isAuthenticated } from '../middleware/auth';
import { cacheGet, cacheSet, cacheKeys } from '../config/cache';
import { generatePracticeCoaching } from '../services/anthropic';
import { PracticeSession, CoachingHistory } from '../types';

const router = Router();
router.use(isAuthenticated);

const COACHING_TTL = 3600; // 1 hour
const PAGE_SIZE    = 10;

// ── GET /api/coaching — Generate (or return cached) coaching advice ───────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const cacheKey = cacheKeys.userCoaching(userId);

    const cached = await cacheGet<{ advice: string; sessionCount: number }>(cacheKey);
    if (cached) {
      res.set('Cache-Control', `private, max-age=${COACHING_TTL}`);
      res.json(cached);
      return;
    }

    // Fetch sessions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await pool.query<PracticeSession>(
      `SELECT * FROM practice_sessions
       WHERE user_id = $1 AND date >= $2
       ORDER BY date DESC`,
      [userId, thirtyDaysAgo.toISOString().split('T')[0]],
    );

    const sessions = result.rows;

    if (sessions.length === 0) {
      res.json({
        advice: "You haven't logged any practice sessions in the last 30 days. Start logging your sessions to receive personalised coaching advice!",
        sessionCount: 0,
      });
      return;
    }

    const advice = await generatePracticeCoaching(sessions);

    // Persist to coaching_history
    await pool.query(
      `INSERT INTO coaching_history (user_id, response_text, session_count)
       VALUES ($1, $2, $3)`,
      [userId, advice, sessions.length],
    );

    const payload = { advice, sessionCount: sessions.length };
    await cacheSet(cacheKey, payload, COACHING_TTL);

    res.set('Cache-Control', `private, max-age=${COACHING_TTL}`);
    res.json(payload);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', error.status, error.message);
      res.status(503).json({
        error: 'Coaching service is temporarily unavailable. Please try again later.',
      });
      return;
    }
    console.error('Coaching error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/coaching/history — Paginated coaching history ───────────────────

router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const [historyResult, countResult] = await Promise.all([
      pool.query<CoachingHistory>(
        `SELECT * FROM coaching_history
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, PAGE_SIZE, offset],
      ),
      pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM coaching_history WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      history: historyResult.rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('Coaching history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
