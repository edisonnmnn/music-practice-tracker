const router = require('express').Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);
// All routes below require authentication
// req.userId is available in all routes

// Adding/Creating a new practice session
router.post('/', async (req, res) => {
    try {
        const { instrument, duration, date, notes } = req.body;
        const userId = req.userId;
        
        if (!instrument || !duration || !date) {
            return res.status(400).json({ 
                error: 'Instrument, duration, and date are required' 
        });
        }
        
        const result = await pool.query(
        `INSERT INTO practice_sessions (user_id, instrument, duration, date, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, instrument, duration, date, notes]
        );
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all sessions
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        
        // This returns all sessions matching user-id to logged-in user ordered by newest first, only seeing thier sessions (filtered by user_id)
        const result = await pool.query(
        `SELECT * FROM practice_sessions 
        WHERE user_id = $1 
        ORDER BY date DESC`,
        [userId]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Server error' });
    }

});

// Get user's practice statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId;
    
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration), 0) as total_minutes
       FROM practice_sessions 
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsResult.rows[0];
    
    const dateStatsResult = await pool.query(
      `SELECT 
        date,
        SUM(duration) as minutes
       FROM practice_sessions
       WHERE user_id = $1
       GROUP BY date
       ORDER BY date ASC`,
      [userId]
    );
    
    res.json({
      totalSessions: parseInt(stats.total_sessions),
      totalMinutes: parseInt(stats.total_minutes),
      totalHours: Math.round(parseInt(stats.total_minutes) / 60 * 10) / 10,
      practiceByDate: dateStatsResult.rows
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single session
router.get('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const sessionId = req.params.id; // From URL parameter
        
        const result = await pool.query(
        `SELECT * FROM practice_sessions 
        WHERE id = $1 AND user_id = $2`,
        [sessionId, userId]
        );
        
        if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update session
router.put('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const sessionId = req.params.id;
        const { instrument, duration, date, notes } = req.body;
        
        // First check if session exists and belongs to user
        const checkResult = await pool.query(
        'SELECT * FROM practice_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
        );
        
        if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
        }
        
        // Update the session
        const result = await pool.query(
        `UPDATE practice_sessions 
        SET instrument = $1, duration = $2, date = $3, notes = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *`,
        [instrument, duration, date, notes, sessionId, userId]
        );
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.userId;
        const sessionId = req.params.id;
        
        const result = await pool.query(
        `DELETE FROM practice_sessions 
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
        [sessionId, userId]
        );
        
        if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ 
        message: 'Session deleted successfully',
        deletedSession: result.rows[0]
        });
        
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});



module.exports = router;