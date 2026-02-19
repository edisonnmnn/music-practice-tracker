const { Pool } = require('pg');

const pool = new Pool({
    user: 'edison', 
    host: 'localhost',
    port: 5432,
    database: 'music_tracker'
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};