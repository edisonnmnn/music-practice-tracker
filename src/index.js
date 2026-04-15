const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

const pool = require('./config/db');

// Updated CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));

app.get('/', (req, res) => {
    console.log('Route hit!');
    res.json({message: 'Practice Tracker is running!'});
});

app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});