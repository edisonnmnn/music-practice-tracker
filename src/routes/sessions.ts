import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { isAuthenticated } from '../middleware/auth';
import { cacheGet, cacheSet, cacheInvalidate, cacheKeys } from '../config/cache';
import { PracticeSession, SessionStats } from '../types';

const router = Router();
router.use(isAuthenticated);

const SESSION_LIST_TTL = 300;  // 5 minutes
const STATS_TTL        = 600;  // 10 minutes

// ── POST / — Create a new practice session ───────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { instrument, duration, date, notes } = req.body as {
      instrument?: string;
      duration?: number;
      date?: string;
      notes?: string;
    };
    const userId = req.user!.id;

    if (!instrument || !duration || !date) {
      res.status(400).json({ error: 'Instrument, duration, and date are required' });
      return;
    }

    const result = await pool.query<PracticeSession>(
      `INSERT INTO practice_sessions (user_id, instrument, duration, date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, instrument, duration, date, notes ?? null],
    );

    await cacheInvalidate(cacheKeys.userSessions(userId), cacheKeys.userStats(userId));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET / — List all sessions for the logged-in user ────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const key = cacheKeys.userSessions(userId);

    const cached = await cacheGet<PracticeSession[]>(key);
    if (cached) {
      res.set('Cache-Control', `private, max-age=${SESSION_LIST_TTL}`);
      res.json(cached);
      return;
    }

    const result = await pool.query<PracticeSession>(
      `SELECT * FROM practice_sessions WHERE user_id = $1 ORDER BY date DESC`,
      [userId],
    );

    await cacheSet(key, result.rows, SESSION_LIST_TTL);
    res.set('Cache-Control', `private, max-age=${SESSION_LIST_TTL}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /stats — Aggregated practice statistics ──────────────────────────────

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const key = cacheKeys.userStats(userId);

    const cached = await cacheGet<SessionStats>(key);
    if (cached) {
      res.set('Cache-Control', `private, max-age=${STATS_TTL}`);
      res.json(cached);
      return;
    }

    const totalsResult = await pool.query<{ total_sessions: string; total_minutes: string }>(
      `SELECT
         COUNT(*)                    AS total_sessions,
         COALESCE(SUM(duration), 0)  AS total_minutes
       FROM practice_sessions
       WHERE user_id = $1`,
      [userId],
    );

    const byDateResult = await pool.query<{ date: Date; minutes: string }>(
      `SELECT date, SUM(duration) AS minutes
       FROM practice_sessions
       WHERE user_id = $1
       GROUP BY date
       ORDER BY date ASC`,
      [userId],
    );

    const { total_sessions, total_minutes } = totalsResult.rows[0];
    const totalMinutes = parseInt(total_minutes, 10);

    const stats: SessionStats = {
      totalSessions: parseInt(total_sessions, 10),
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      practiceByDate: byDateResult.rows.map((r) => ({
        date: r.date,
        minutes: parseInt(r.minutes, 10),
      })),
    };

    await cacheSet(key, stats, STATS_TTL);
    res.set('Cache-Control', `private, max-age=${STATS_TTL}`);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /:id — Get a single session ─────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params['id'] as string, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const result = await pool.query<PracticeSession>(
      `SELECT * FROM practice_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /:id — Update a session ──────────────────────────────────────────────

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params['id'] as string, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const { instrument, duration, date, notes } = req.body as {
      instrument?: string;
      duration?: number;
      date?: string;
      notes?: string;
    };

    const checkResult = await pool.query<{ id: number }>(
      `SELECT id FROM practice_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const result = await pool.query<PracticeSession>(
      `UPDATE practice_sessions
       SET instrument = $1, duration = $2, date = $3, notes = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [instrument, duration, date, notes ?? null, sessionId, userId],
    );

    await cacheInvalidate(cacheKeys.userSessions(userId), cacheKeys.userStats(userId));

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /:id — Delete a session ───────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params['id'] as string, 10);

    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const result = await pool.query<PracticeSession>(
      `DELETE FROM practice_sessions WHERE id = $1 AND user_id = $2 RETURNING *`,
      [sessionId, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await cacheInvalidate(cacheKeys.userSessions(userId), cacheKeys.userStats(userId));

    res.json({ message: 'Session deleted successfully', deletedSession: result.rows[0] });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
