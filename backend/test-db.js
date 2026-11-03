require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query('SELECT now()')
  .then(r => { console.log('Connected:', r.rows[0].now); return pool.end(); })
  .catch(e => { console.error('Failed:', e.message); return pool.end(); });