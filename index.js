const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

// Testing Database Connection
const pool = require('./config/db');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));

// Test route
app.get('/', (req, res) => {
    console.log('Route hit!'); // Add this line
    res.json({message: 'Practice Tracker is running!'});
});

app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});