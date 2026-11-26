const express = require('express');
const pool = require('../db');
const router = express.Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_TERMS = 5;

// Escape LIKE wildcards so a search for "50%" or "a_b" is taken literally
const escapeLike = (text) => text.replace(/[\\%_]/g, (ch) => '\\' + ch);

// GET /api/items?search=chicken pesto        -> items whose name or restaurant match every word
// GET /api/items?restaurant=Il Forno         -> all items at one restaurant (original behavior)
// GET /api/items?search=pasta&restaurant=... -> both filters together
// Optional: &limit=20 (max 50)
router.get('/', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const restaurant = typeof req.query.restaurant === 'string' ? req.query.restaurant.trim() : '';

    if (!search && !restaurant) {
      return res.status(400).json({ error: 'Provide a search term or a restaurant' });
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const params = [];
    const conditions = [];

    // Every word has to appear in the item name or the restaurant name
    const terms = search.split(/\s+/).filter(Boolean).slice(0, MAX_TERMS);
    for (const term of terms) {
      params.push(`%${escapeLike(term)}%`);
      const p = `$${params.length}`;
      conditions.push(`(name ILIKE ${p} ESCAPE '\\' OR restaurant ILIKE ${p} ESCAPE '\\')`);
    }

    if (restaurant) {
      params.push(restaurant);
      conditions.push(`restaurant = $${params.length}`);
    }

    // Rank names that start with the search ahead of names that only contain it
    params.push(`${escapeLike(search)}%`);
    const startsWith = `$${params.length}`;

    params.push(restaurant && !search ? 1000 : limit); // a full restaurant menu isn't capped at 20
    const limitParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT id, name, restaurant, kcal, protein_g, carbs_g, total_fat_g
      FROM items
      WHERE ${conditions.join(' AND ')}
      ORDER BY (name ILIKE ${startsWith} ESCAPE '\\') DESC, name
      LIMIT ${limitParam}`,
      params
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
