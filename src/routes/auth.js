const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation Checks
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'name, email, and password required!'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters' 
            });
        }

        const userExists = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email is already registered'});
        }

        // User registration
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', 
            [name, email, hashedPassword]);

        const user = result.rows[0];

        // JWT Token Creation
        const token = jwt.sign( 
            {userId: user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '14d' }
        );

        res.status(201).json({
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Registration Error', error);

        if (error.code === '23505') {
            return res.status(400).json({ 
                error: 'Email already registered' 
            });
        }

        res.status(500).json({ error: 'Server Error: Signup Failed'});
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required!'
            });
        }
        
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );
        if (result.rows.length === 0 ) {
            return res.status(400).json({
                error: 'Invalid credentials'
            })
        }
        const user = result.rows[0];

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass){
            return res.status(401).json({ error: 'Invalid credentials'});
        }   

        const token = jwt.sign(
            { userId: user.id},
            process.env.JWT_SECRET,
            { expiresIn: '14d' }
        );

        res.status(200).json({
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
})

module.exports = router;