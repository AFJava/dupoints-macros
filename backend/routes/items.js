const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/items?restaurant=...
router.get('/', async (req, res) => {
  try {
    const { restaurant } = req.query; // Object destructuring to get the restaurant query parameter
    const result = await pool.query(
      'SELECT id, name, kcal, protein_g FROM items WHERE restaurant = $1 ORDER BY name',
      [restaurant]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;