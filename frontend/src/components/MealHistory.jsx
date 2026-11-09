import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { createMealLog } from "../lib/mealLogs.js";

// The API should return these fields for each meal log:
// id, item_id, quantity, meal_date, meal_type,
// name, restaurant, kcal, protein_g, carbs_g, total_fat_g

const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

// Format a date as "Monday, November 9, 2026".
function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Get a local calendar date key for grouping meals by day.
function getDateKey(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function MealHistory() {
  const [mealLogs, setMealLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Retrieve the current user's meal history.
  const fetchMealHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session) {
        throw new Error("You must be logged in to view meal history.");
      }

      const response = await fetch("http://localhost:3001/api/meal-logs", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to retrieve meal history.");
      }

      const data = await response.json();
      setMealLogs(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealHistory();
  }, [fetchMealHistory]);

  // Log a previous meal again using today's date.
  async function handleRelog(log) {
    try {
      await createMealLog({
        item_id: Number(log.item_id),
        quantity: Number(log.quantity),
        meal_type: log.meal_type || "snack",
        meal_date: new Date().toLocaleDateString("en-CA"),
      });

      // Refresh the history so the new entry appears.
      await fetchMealHistory();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  // Show a loading message while the API request is running.
  if (loading) {
    return <div className="page">Loading meal history...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <h1>Meal History</h1>
        <p>{error}</p>
        <button onClick={fetchMealHistory}>Try Again</button>
      </div>
    );
  }

  // Group meal logs by calendar date.
  const groupedMeals = {};

  for (const log of mealLogs) {
    const dateKey = getDateKey(log.meal_date);

    if (!groupedMeals[dateKey]) {
      groupedMeals[dateKey] = [];
    }

    groupedMeals[dateKey].push(log);
  }

  // Sort dates from newest to oldest.
  const sortedDates = Object.keys(groupedMeals).sort((a, b) =>
    b.localeCompare(a),
  );

  // Calculate frequently logged meals.
  const mealFrequency = {};

  for (const log of mealLogs) {
    const itemId = log.item_id;

    if (!mealFrequency[itemId]) {
      mealFrequency[itemId] = {
        ...log,
        count: 0,
      };
    }

    mealFrequency[itemId].count += 1;
  }

  const goToMeals = Object.values(mealFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="page">
      <h1>Meal History</h1>
      <p>Review your previous meals and log them again.</p>

      {/* Section 1: Frequently logged meals */}
      <h2>Go-To Meals</h2>

      {goToMeals.length === 0 ? (
        <p>Your frequently logged meals will appear here.</p>
      ) : (
        <div className="row">
          {goToMeals.map((meal) => (
            <div className="meal-card" key={meal.item_id}>
              <h3>{meal.name}</h3>

              <p>{meal.restaurant}</p>

              <p>{meal.kcal * meal.quantity} calories</p>

              <p>
                Logged {meal.count} {meal.count === 1 ? "time" : "times"}
              </p>

              <button onClick={() => handleRelog(meal)}>Log Again</button>
            </div>
          ))}
        </div>
      )}

      {/* Section 2: Daily nutrition summaries */}
      <h2>Daily Summary</h2>

      {sortedDates.length === 0 ? (
        <p>You haven't logged any meals yet.</p>
      ) : (
        sortedDates.map((dateKey) => {
          const meals = groupedMeals[dateKey];

          const totals = meals.reduce(
            (summary, meal) => {
              const quantity = Number(meal.quantity);

              summary.calories += Number(meal.kcal || 0) * quantity;
              summary.protein += Number(meal.protein_g || 0) * quantity;
              summary.carbs += Number(meal.carbs_g || 0) * quantity;
              summary.fat += Number(meal.total_fat_g || 0) * quantity;

              return summary;
            },
            {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            },
          );

          return (
            <div className="daily-summary" key={dateKey}>
              <h3>{formatDate(meals[0].meal_date)}</h3>

              <div className="row">
                <p>Calories: {totals.calories.toFixed(0)}</p>

                <p>Protein: {totals.protein.toFixed(1)}g</p>

                <p>Carbs: {totals.carbs.toFixed(1)}g</p>

                <p>Fat: {totals.fat.toFixed(1)}g</p>
              </div>
            </div>
          );
        })
      )}

      {/* Section 3: Individual meal entries */}
      <h2>All Meals</h2>

      {sortedDates.map((dateKey) => {
        const meals = groupedMeals[dateKey];

        return (
          <div className="meal-day" key={dateKey}>
            <h3>{formatDate(meals[0].meal_date)}</h3>

            {mealTypes.map((type) => {
              const mealsForType = meals.filter(
                (meal) => meal.meal_type === type,
              );

              if (mealsForType.length === 0) {
                return null;
              }

              return (
                <div key={type}>
                  <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>

                  {mealsForType.map((meal) => (
                    <div className="meal-card" key={meal.id}>
                      <h4>{meal.name}</h4>

                      <p>{meal.restaurant}</p>

                      <p>Quantity: {meal.quantity}</p>

                      <p>
                        {Number(meal.kcal * meal.quantity).toFixed(0)} calories
                      </p>

                      <button onClick={() => handleRelog(meal)}>
                        Log Again
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
