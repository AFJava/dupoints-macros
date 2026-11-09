const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const { isValidDate } = require('../utils/dateUtils');
const router = express.Router(); // Create a new router object to handle routes related to trends
const authenticateUser = require('../middleware/authenticateUser');

// Map nutrient names to database col. names
const allowedNutrients = {calories: "kcal", protein: "protein_g", carbs: "carbs_g", fat: "total_fat_g", fiber: "fiber_g"};

// Standard nutrients shown if the request does not choose any
const defaultNutrients = ['calories', 'protein', 'carbs'];

const validPeriods = ['week', 'month'];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const round1 = (n) => Math.round(n * 10) / 10;

// Converts a Date to a YYYY-MM-DD string
const toDateString = (ms) => new Date(ms).toISOString().slice(0, 10);

// GET /api/trends?period=week|month&date=YYYY-MM-DD&nutrients=calories,protein,carbs
//   week  = the 7 days ending on date
//   month = the calendar month that contains date (through today if it is the current month)
// date defaults to today; nutrients defaults to calories, protein, and carbs
router.get('/', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { period, nutrients, date } = req.query;

        // Validate period
        if (!validPeriods.includes(period)) {
            return res.status(400).json({ error: 'Period must be one of: week, month' });
        }

        // Validate date if one was given, otherwise use today
        if (date !== undefined && !isValidDate(date)) {
            return res.status(400).json({ error: 'Date must be a valid calendar date' });
        }
        const today = toDateString(Date.now());
        const anchor = date ?? today;
        const anchorMs = new Date(anchor + 'T00:00:00Z').getTime();

        // Work out the date range, include start/end days
        let startMs;
        let endMs;
        if (period === 'week') {
            startMs = anchorMs - 6 * MS_PER_DAY;
            endMs = anchorMs;
        } else {
            const d = new Date(anchorMs);
            startMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
            const lastOfMonthMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
            // For the current month, stop at today so future days don't show up as empty.
            // Past months show every day, and a future month shows its full (empty) month.
            const todayMs = new Date(today + 'T00:00:00Z').getTime();
            endMs = startMs > todayMs ? lastOfMonthMs : Math.min(lastOfMonthMs, todayMs);
        }
        const start = toDateString(startMs);
        const end = toDateString(endMs);
        const dayCount = Math.round((endMs - startMs) / MS_PER_DAY) + 1;

        // Validate nutrients with the default = calories, protein, and carbs
        let selected = defaultNutrients;
        if (nutrients !== undefined) {
            if (typeof nutrients !== 'string' || !nutrients.trim()) {
                return res.status(400).json({ error: 'Select at least one nutrient to display' });
            }
            selected = [...new Set(nutrients.split(',').map(name => name.trim()))];
            if (selected.some(name => !Object.hasOwn(allowedNutrients, name))) {
                return res.status(400).json({ error: 'Invalid nutrient selection' });
            }
        }

        // Build the SUM columns from the whitelisted names 
        const sums = selected
            .map(name => `COALESCE(SUM(i.${allowedNutrients[name]} * ml.quantity), 0) AS ${name}`)
            .join(', ');

        // 1. Nutrient totals for each day that has at least one logged meal
        const dailyResult = await pool.query(
            `SELECT to_char(ml.meal_date::date, 'YYYY-MM-DD') AS day, ${sums}
            FROM meal_logs ml
            JOIN items i ON i.id = ml.item_id
            WHERE ml.user_id = $1
                AND ml.meal_date >= $2::date
                AND ml.meal_date < ($3::date + INTERVAL '1 day')
            GROUP BY ml.meal_date::date
            ORDER BY ml.meal_date::date`,
            [user_id, start, end]
        );

        // 2. Restaurants ranked by how many meals were logged there
        const restaurantResult = await pool.query(
            `SELECT i.restaurant, COUNT(*) AS meals_logged
            FROM meal_logs ml
            JOIN items i ON i.id = ml.item_id
            WHERE ml.user_id = $1
                AND ml.meal_date >= $2::date
                AND ml.meal_date < ($3::date + INTERVAL '1 day')
            GROUP BY i.restaurant
            ORDER BY meals_logged DESC, i.restaurant ASC
            LIMIT 5`,
            [user_id, start, end]
        );

        // no meals will show up as 0
        const byDay = new Map(dailyResult.rows.map(row => [row.day, row]));
        const daily = [];
        for (let d = 0; d < dayCount; d++) {
            const day = toDateString(startMs + d * MS_PER_DAY);
            const row = byDay.get(day);
            const entry = { date: day };
            for (const name of selected) {
                entry[name] = row ? round1(Number(row[name])) : 0;
            }
            daily.push(entry);
        }

        // Averages are taken over days that have at least one logged meal
        const days_logged = dailyResult.rows.length;
        const averages = Object.fromEntries(
            selected.map(name => [
                name,
                days_logged === 0
                    ? 0
                    : round1(dailyResult.rows.reduce((sum, row) => sum + Number(row[name]), 0) / days_logged)
            ])
        );

        // Restaurant breakdown, most visited first
        const top_restaurants = restaurantResult.rows.map(row => ({
            restaurant: row.restaurant,
            meals_logged: Number(row.meals_logged)
        }));

        res.status(200).json({
            period,
            start_date: start,
            end_date: end,
            days_logged,
            most_common_restaurant: top_restaurants.length > 0 ? top_restaurants[0].restaurant : null,
            top_restaurants,
            averages,
            daily
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
