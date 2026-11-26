const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const router = express.Router(); // Create a new router object to handle routes related to user profiles
const authenticateUser = require('../middleware/authenticateUser');
const { dailyTargets, MIN_CALORIES, MAX_CALORIES } = require('../utils/nutritionTargets');

const validGoals = ['lose', 'maintain', 'gain'];

// GET /api/profile
router.get('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT p.age,
                p.height_cm,
                p.body_weight_kg,
                p.activity_level,
                p.goal,
                SUBSTRING(m.plan FROM '[A-Za-z]$') AS meal_plan_id,
                p.updated_at,
                p.current_balance,
                p.balance_updated_at,
                p.target_calories
            FROM user_profiles p
            LEFT JOIN meal_plans m ON m.id = p.meal_plan_id
            WHERE p.user_id = $1
            `,
            [user_id]
        );

        // No profile saved yet; the frontend shows a blank form
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profile = result.rows[0];
        res.status(200).json({ ...profile, targets: dailyTargets(profile) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT /api/profile
router.put('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            age,
            height_cm,
            body_weight_kg,
            activity_level,
            goal,
            meal_plan_id,
            target_calories,
        } = req.body;

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

        // Custom calorie goal is optional; null (or missing) means "use the recommended value"
        let targetCalories = null;
        if (target_calories !== null && target_calories !== undefined) {
            if (
                !Number.isInteger(target_calories) ||
                target_calories < MIN_CALORIES ||
                target_calories > MAX_CALORIES
            ) {
                return res.status(400).json({
                    error: `Calorie goal must be a whole number from ${MIN_CALORIES} to ${MAX_CALORIES}`
                });
            }
            targetCalories = target_calories;
        }

        // Convert the plan letter (e.g. "A") to its UUID; empty means no plan
        let mealPlanUuid = null;
        if (meal_plan_id !== null && meal_plan_id !== undefined && meal_plan_id !== "") {
            const plan = await pool.query(
                'SELECT id FROM meal_plans WHERE plan = $1',
                [`Plan ${meal_plan_id}`]
            );
            if (plan.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid meal plan' });
            }
            mealPlanUuid = plan.rows[0].id;
        }

        // Insert the profile, or update it if this user already has one
        const result = await pool.query(
            `INSERT INTO user_profiles (
            user_id,
            age,
            height_cm,
            body_weight_kg,
            activity_level,
            goal,
            meal_plan_id,
            target_calories
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO UPDATE SET
            age = EXCLUDED.age,
            height_cm = EXCLUDED.height_cm,
            body_weight_kg = EXCLUDED.body_weight_kg,
            activity_level = EXCLUDED.activity_level,
            meal_plan_id = EXCLUDED.meal_plan_id,
            goal = EXCLUDED.goal,
            target_calories = EXCLUDED.target_calories,
            updated_at = NOW()
            RETURNING age, height_cm, body_weight_kg, activity_level, goal, meal_plan_id,
                target_calories, updated_at`,
            [user_id, age, height_cm, body_weight_kg, activity_level, goal, mealPlanUuid, targetCalories]
        );

        const profile = result.rows[0];
        res.status(200).json({ ...profile, targets: dailyTargets(profile) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// PATCH /api/profile/balance — update just the food points balance
router.patch('/balance', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        const balance = Number(req.body.current_balance);

        if (!Number.isFinite(balance) || balance < 0) {
            return res.status(400).json({ error: 'Balance must be a number of zero or more' });
        }

        const result = await pool.query(
            `UPDATE user_profiles
            SET current_balance = $2,
                balance_updated_at = NOW()
            WHERE user_id = $1
            RETURNING current_balance, balance_updated_at`,
            [user_id, balance]
        );

        // The balance lives on the profile row, so the profile has to exist first
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Save your profile before adding a balance' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
