import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { isAuthenticated } from '../middleware/auth';
import { streamPracticeCoaching } from '../services/gemini';
import { PracticeSession, CoachingHistory } from '../types';

const router = Router();
router.use(isAuthenticated);

const PAGE_SIZE = 10;

// ── POST /api/coaching — Stream coaching advice via SSE ──────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userPrompt = (req.body as { prompt?: string }).prompt?.trim() || '';

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
        done: true,
      });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send session count first
    res.write(`data: ${JSON.stringify({ sessionCount: sessions.length })}\n\n`);

    let fullText = '';

    for await (const chunk of streamPracticeCoaching(sessions, userPrompt)) {
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Signal done
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Save to history after streaming completes
    await pool.query(
      `INSERT INTO coaching_history (user_id, response_text, session_count)
       VALUES ($1, $2, $3)`,
      [userId, fullText, sessions.length],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('GEMINI_API_KEY')) {
      res.status(503).json({ error: 'Coaching service is not configured.' });
      return;
    }
    console.error('Coaching error:', error);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Coaching service is temporarily unavailable. Please try again later.',
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
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
