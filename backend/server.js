const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // lets POST routes read JSON bodies

app.use('/api/items', require('./routes/items'));
app.use('/api/meal-logs', require('./routes/mealLogs'));
app.use('/api/meal-totals', require('./routes/mealTotals'));
app.use('/api/profile', require('./routes/profile'));

// Health check for the API server.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Health check for the database connection.
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await require('./db').query('SELECT NOW()');
    res.json({
      status: 'connected',
      database_time: result.rows[0].now
    });
  } catch (err) {
        console.error('Database error object:', err);
        console.error('Error message:', err?.message);
        console.error('Error code:', err?.code);
        res.status(500).json({ status: 'error' });
}
});

app.listen(3001, () => console.log('API running on http://localhost:3001'));