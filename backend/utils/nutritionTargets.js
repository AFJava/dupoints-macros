// (Written with help from Claude, an LLM.)
// Daily nutrition targets from a user's profile.
//
// Calories use the Mifflin-St Jeor equation with a sex-neutral constant.
// The standard equation adds +5 (male) or -161 (female); we use the midpoint (-78)
// so nobody has to pick a sex. That is at most ~83 kcal/day from either version,
// which is small next to the uncertainty in the activity multiplier.
// These are estimates, not medical advice. Users can override calories with their own goal.

const MIN_CALORIES = 1200;
const MAX_CALORIES = 6000;

// Workout days per week (0-7) -> standard activity multipliers
function activityFactor(workoutDays) {
    if (workoutDays <= 0) return 1.2; // sedentary
    if (workoutDays <= 2) return 1.375; // lightly active
    if (workoutDays <= 4) return 1.55; // moderately active
    return 1.725; // very active
}

const GOAL_FACTORS = { lose: 0.85, maintain: 1, gain: 1.1 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function recommendedCalories(profile) {
    const weight = Number(profile.body_weight_kg);
    const height = Number(profile.height_cm);
    const age = Number(profile.age);
    const workoutDays = Number(profile.activity_level);

    const resting = 10 * weight + 6.25 * height - 5 * age - 78;
    const total = resting * activityFactor(workoutDays) * (GOAL_FACTORS[profile.goal] ?? 1);

    // Round to the nearest 10 kcal and keep it in a safe range
    return clamp(Math.round(total / 10) * 10, MIN_CALORIES, MAX_CALORIES);
}

// Returns { calories, recommended_calories, source, protein_g, carbs_g, fat_g, fiber_g }
function dailyTargets(profile) {
    const recommended = recommendedCalories(profile);
    const custom =
        profile.target_calories === null || profile.target_calories === undefined
            ? null
            : Number(profile.target_calories);
    const calories = custom ?? recommended;

    // Protein from body weight (a bit higher when losing or gaining), capped at 35% of calories
    const proteinPerKg = profile.goal === 'maintain' ? 1.2 : 1.4;
    const protein = Math.min(Number(profile.body_weight_kg) * proteinPerKg, (calories * 0.35) / 4);

    // Fat at 30% of calories; carbs fill whatever is left
    const fat = (calories * 0.3) / 9;
    const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);

    // Dietary Guidelines: 14 g fiber per 1,000 kcal
    const fiber = (calories / 1000) * 14;

    return {
        calories,
        recommended_calories: recommended,
        source: custom === null ? 'recommended' : 'custom',
        protein_g: Math.round(protein),
        carbs_g: Math.round(carbs),
        fat_g: Math.round(fat),
        fiber_g: Math.round(fiber),
    };
}

module.exports = { dailyTargets, recommendedCalories, MIN_CALORIES, MAX_CALORIES };
