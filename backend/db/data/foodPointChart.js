// Loads food point plan data from foodpoints.csv and calculates expected
// balances for any date in the semester.
// CSV columns: plan, total, weekly, daily   (e.g. "Plan A,3071.28,191.96,27.42")

const fs = require('fs');
const path = require('path');

// Fall 2026 semester window from the Duke Dining chart (balance hits 0.00 on Dec 14).
// Update these two dates each semester along with the CSV.
const SEMESTER_START = new Date('2026-08-24T00:00:00Z');
const SEMESTER_END = new Date('2026-12-14T00:00:00Z');

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TOTAL_DAYS = (SEMESTER_END - SEMESTER_START) / MS_PER_DAY; // 112
const TOTAL_WEEKS = TOTAL_DAYS / 7; // 16

// Rounds to 2 decimals
const round2 = (n) => Math.round(n * 100 + 1e-6) / 100;

// Read the CSV once when the server starts:
// { A: { total: 3071.28, weekly: 191.96, daily: 27.42 }, B: {...}, ... }
function loadPlans() {
    const text = fs.readFileSync(path.join(__dirname, 'foodpoints.csv'), 'utf8');
    const plans = {};

    text.split(/\r?\n/).slice(1).forEach((line) => {
        if (!line.trim()) return;
        const [plan, total, weekly, daily] = line.split(/[,\t]/);
        // "Plan A" -> "A"
        const letter = plan.replace(/plan/i, '').trim().toUpperCase();
        plans[letter] = { total: Number(total), weekly: Number(weekly), daily: Number(daily) };
    });

    return plans;
}

const PLANS = loadPlans();

// Just the starting totals: { A: 3071.28, ... }
const PLAN_TOTALS = Object.fromEntries(
    Object.entries(PLANS).map(([letter, p]) => [letter, p.total])
);

// Expected remaining balance on a given date: a straight line from the plan total down to 0
function expectedRemaining(planLetter, date = new Date()) {
    const total = PLAN_TOTALS[planLetter];
    if (total === undefined) return null;

    const elapsedDays = Math.min(Math.max((date - SEMESTER_START) / MS_PER_DAY, 0), TOTAL_DAYS);
    return total * (1 - elapsedDays / TOTAL_DAYS);
}

// Week-by-week expected balance if the student spends the recommended amount:
// [{ week: 0, week_start: '2026-08-24', expected_remaining: 3071.28 }, ... , { week: 16, ... 0 }]
function weeklySchedule(planLetter) {
    const total = PLAN_TOTALS[planLetter];
    if (total === undefined) return null;

    const schedule = [];
    for (let i = 0; i <= TOTAL_WEEKS; i++) {
        const weekStart = new Date(SEMESTER_START.getTime() + i * 7 * MS_PER_DAY);
        schedule.push({
            week: i,
            week_start: weekStart.toISOString().slice(0, 10),
            expected_remaining: round2(total * (1 - i / TOTAL_WEEKS))
        });
    }
    return schedule;
}

module.exports = {
    PLANS,
    PLAN_TOTALS,
    SEMESTER_START,
    SEMESTER_END,
    TOTAL_WEEKS,
    expectedRemaining,
    weeklySchedule
};
