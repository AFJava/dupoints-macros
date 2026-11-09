const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const router = express.Router(); // Create a new router object to handle routes related to user profiles
const authenticateUser = require('../middleware/authenticateUser');

const validGoals = ['lose', 'maintain', 'gain'];

// GET /api/profile
router.get('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT age, height_cm, body_weight_kg, activity_level, goal, meal_plan_id, updated_at
            FROM user_profiles WHERE user_id = $1`,
            [user_id]
        );

        // No profile saved yet; the frontend shows a blank form
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /api/profile
router.put('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { age, height_cm, body_weight_kg, activity_level, goal } = req.body;

        // Validate that age is a positive integer
        if (!Number.isInteger(age) || age <= 0) {
            return res.status(400).json({
                error: 'Age must be a positive whole number'
            });
        }

        // Validate that height and weight are positive numbers
        if (!Number.isFinite(height_cm) || height_cm <= 0) {
            return res.status(400).json({
                error: 'Height must be a positive number (cm)'
            });
        }

        if (!Number.isFinite(body_weight_kg) || body_weight_kg <= 0) {
            return res.status(400).json({
                error: 'Weight must be a positive number (kg)'
            });
        }

        // Validate that activity_level is a whole number of workout days from 0 to 7
        if (!Number.isInteger(activity_level) || activity_level < 0 || activity_level > 7) {
            return res.status(400).json({
                error: 'Activity level must be a whole number from 0 to 7'
            });
        }

        // Validate that goal is one of the valid options
        if (!validGoals.includes(goal)) {
            return res.status(400).json({
                error: 'Invalid goal. Must be one of: lose, maintain, gain'
            });
        }

        // Insert the profile, or update it if this user already has one
        const result = await pool.query(
            `INSERT INTO user_profiles (
            user_id,
            age,
            height_cm,
            body_weight_kg,
            activity_level,
            goal
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO UPDATE SET
            age = EXCLUDED.age,
            height_cm = EXCLUDED.height_cm,
            body_weight_kg = EXCLUDED.body_weight_kg,
            activity_level = EXCLUDED.activity_level,
            goal = EXCLUDED.goal,
            updated_at = NOW()
            RETURNING age, height_cm, body_weight_kg, activity_level, goal, meal_plan_id, updated_at`,
            [user_id, age, height_cm, body_weight_kg, activity_level, goal]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
