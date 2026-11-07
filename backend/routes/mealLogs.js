const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const { isValidDate } = require('../utils/dateUtils');
const router = express.Router(); // Create a new router object to handle routes related to meal logs

const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

// POST /api/meal-logs
router.post('/', async (req, res) => {
    try {
        // Change for auth later: const user_id = req.user.id; 
        // Assuming you have user authentication and the user ID is available in req.user
        const { user_id, item_id, quantity, meal_date, meal_type } = req.body;
        
        // Validate that quantity is a positive number
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({
                error: 'Quantity must be a positive number'
            });
        }

        // Validate that meal_type is one of the valid options
        if (!validMealTypes.includes(meal_type)) {
            return res.status(400).json({
                error: 'Invalid meal type. Must be one of: breakfast, lunch, dinner, snack'
            });
        }

        // Validate that meal_date is a valid date
        if(!isValidDate(meal_date)) {
            return res.status(400).json({
                error: 'Meal date must be a valid calendar date'
            });
        }

        // Validate that item_id is an integer
        if(!Number.isSafeInteger(item_id) || item_id <= 0) {
            return res.status(400).json({
                error: 'Item ID must be a positive integer'
            });
        }

        // Check if the item exists in the database
        const itemResult = await pool.query('SELECT id FROM items WHERE id = $1', [item_id]);
        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Item not found'
            });
        }

        // Insert the meal log into the database
        const result = await pool.query(
            'INSERT INTO meal_logs (user_id, item_id, quantity, meal_date, meal_type) VALUES ($1, $2, $3, $4) RETURNING *',
            [user_id, item_id, quantity, meal_type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;