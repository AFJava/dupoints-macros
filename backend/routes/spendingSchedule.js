const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const router = express.Router(); // Create a new router object to handle routes related to the spending schedule
const authenticateUser = require('../middleware/authenticateUser');
const { PLANS, SEMESTER_START, SEMESTER_END, weeklySchedule } = require('../data/foodPointChart');

// GET /api/spending/schedule
// Returns the expected weekly balance for the user's meal plan, assuming they spend
// the recommended daily amount. Does not use any logged meals or item prices.
router.get('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;

        // Look up the user's meal plan (set in Feature 1). meal_plan_id points to meal_plans,
        // whose "plan" column holds a label like "Plan A"
        const planResult = await pool.query(
            `SELECT mp.plan
            FROM user_profiles up
            JOIN meal_plans mp ON mp.id = up.meal_plan_id
            WHERE up.user_id = $1`,
            [user_id]
        );

        // User has no profile or never picked a plan; prompt them to choose one
        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'No meal plan selected' });
        }

        // "Plan A" -> "A" (matches foodpoints.csv)
        const plan_letter = planResult.rows[0].plan.replace(/plan/i, '').trim().toUpperCase();

        if (!PLANS[plan_letter]) {
            return res.status(400).json({ error: 'Unknown meal plan: ' + plan_letter });
        }

        const schedule = weeklySchedule(plan_letter);

        // Find current week
        const now = new Date();
        let current_week = null;
        if (now >= SEMESTER_START && now < SEMESTER_END) {
            current_week = schedule.filter((w) => new Date(w.week_start + 'T00:00:00Z') <= now).length - 1;
        }

        res.status(200).json({
            plan_letter,
            total: PLANS[plan_letter].total,
            weekly_amount: PLANS[plan_letter].weekly,
            daily_amount: PLANS[plan_letter].daily,
            current_week, // null before the semester starts or after it ends
            schedule
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
