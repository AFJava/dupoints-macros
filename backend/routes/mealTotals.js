const express = require('express'); // Import the Express library
const pool = require('../db'); // Import the database connection pool from the db.js file
const { isValidDate } = require('../utils/dateUtils');
const router = express.Router(); // Create a new router object to handle routes related to meal logs

//Map selected nutrients to database column names
const allowedNutrients = {calories: "kcal", protein: "protein_g", carbs: "carbs_g", fat: "total_fat_g", fiber: "fiber_g"};

//GET /api/meal-totals?user_id=...&nutrients=...&start_date=...&end_date=...
router.get('/', async (req, res) => {
    try {
        //End is current date by default
        const { user_id, nutrients, start_date, end_date} = req.query;

        // Validate that start, end are dates
        if(!isValidDate(start_date)) {
            return res.status(400).json({
                error: 'Start date must be a valid calendar date'
            });
        }

        if(!isValidDate(end_date)) {
            return res.status(400).json({
                error: 'End date must be a valid calendar date'
            });
        }

        // Validate that start_date precedes end_date
        if(! (start_date <= end_date)) {
            return res.status(400).json({
                error: 'Start date must be on or before end date'
            });
        }

        // Validate nutrients
        if (typeof nutrients !== "string" || !nutrients.trim()) {
            return res.status(400).json({ error: "Select at least one nutrient to display" });
        }

        const selected = [...new Set(
            nutrients.split(",").map(name => name.trim())
        )];

        // Validate that selected nutrient values are in the list of allowed values
        if (selected.some(name => !Object.hasOwn(allowedNutrients, name))) {
            return res.status(400).json({ error: "Invalid nutrient selection" });
        }

        // Parse selected nutrient into queryable string
        const columns = selected.map(name => allowedNutrients[name]).join(", ");

        const result = await pool.query(`
            SELECT i.name, ${columns}, ml.quantity FROM meal_logs ml
            JOIN items i ON i.item_id = ml.item_id
            WHERE user_id = $1
                AND meal_date >= $2
                AND meal_date <= $3`,
            [user_id, start_date, end_date]
        );

        // Initialize totals using the selected API nutrient names.
        const totals = Object.fromEntries(
            selected.map(name => [name, 0])
        );

        //Aggregate columns manually
        for (const log of result.rows) {
            const quantity = Number(log.quantity);

            for (const nutrient of selected) {
                const column = allowedNutrients[nutrient];
                totals[nutrient] += Number(log[column] ?? 0) * quantity;
            }
        }

        //Return and display rows and totals for the selected time frame
        res.status(200).json({
            logs: result.rows,
            totals
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;