// (Written with help from Claude, an LLM.)

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { createMealLog } from "../lib/mealLogs.js";
import { PageHeader } from "./AppLayout.jsx";
import { IconPlus, IconSearch } from "./Icons.jsx";

// The API should return these fields for each meal log:
// id, item_id, quantity, meal_date, meal_type,
// name, restaurant, kcal, protein_g, carbs_g, total_fat_g

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];

const formatKcal = (n) => Math.round(n).toLocaleString("en-US");

// Parse "2026-11-09" (or a timestamp) as a local date to avoid off-by-one-day errors.
function toLocalDate(dateString) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "Monday, November 9, 2026"
function formatDate(dateString) {
  return toLocalDate(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// "2026-11" -> "November 2026"
function formatMonth(monthKey) {
  return toLocalDate(`${monthKey}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function mealCalories(meal) {
  return Number(meal.kcal || 0) * Number(meal.quantity || 1);
}

function sumDay(meals) {
  return meals.reduce(
    (totals, meal) => {
      const quantity = Number(meal.quantity || 1);
      totals.calories += Number(meal.kcal || 0) * quantity;
      totals.protein += Number(meal.protein_g || 0) * quantity;
      totals.carbs += Number(meal.carbs_g || 0) * quantity;
      totals.fat += Number(meal.total_fat_g || 0) * quantity;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// Breakfast -> lunch -> dinner -> snack, then anything without a known type.
function mealTypeRank(type) {
  const index = MEAL_TYPE_ORDER.indexOf(type);
  return index === -1 ? MEAL_TYPE_ORDER.length : index;
}

function MealTypeTag({ type }) {
  const known = MEAL_TYPE_ORDER.includes(type);
  return (
    <span className={`dm-tag${known ? ` dm-tag-${type}` : ""}`}>{known ? type : "Other"}</span>
  );
}

function LogAgainButton({ meal, busy, onRelog }) {
  return (
    <button
      type="button"
      className="dm-btn dm-btn-secondary dm-btn-sm"
      onClick={() => onRelog(meal)}
      disabled={busy}
      aria-label={`Log ${meal.name} again`}
    >
      <IconPlus size={14} />
      {busy ? "Logging…" : "Log again"}
    </button>
  );
}

export default function MealHistory({ onLogMeal }) {
  const [mealLogs, setMealLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [relogKey, setRelogKey] = useState(null); // which "Log again" button is busy
  const [status, setStatus] = useState({ type: "", text: "" });
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");

  // `silent` refreshes in the background without swapping the page for a loading state.
  const fetchMealHistory = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setLoadError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw new Error(sessionError.message);
      if (!session) throw new Error("You must be logged in to view meal history.");

      const response = await fetch("http://localhost:3001/api/meal-logs", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to retrieve meal history.");
      }

      setMealLogs(await response.json());
    } catch (err) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMealHistory();
  }, [fetchMealHistory]);

  // Log a previous meal again using today's date.
  async function handleRelog(meal, key) {
    setRelogKey(key);
    setStatus({ type: "", text: "" });
    try {
      await createMealLog({
        item_id: Number(meal.item_id),
        quantity: Number(meal.quantity),
        meal_type: meal.meal_type || "snack",
        meal_date: new Date().toLocaleDateString("en-CA"),
      });
      await fetchMealHistory({ silent: true });
      setStatus({ type: "success", text: `Logged ${meal.name} for today.` });
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: err.message || "Couldn't log that meal. Try again." });
    } finally {
      setRelogKey(null);
    }
  }

  // Group by calendar day, newest first.
  const days = useMemo(() => {
    const groups = {};
    for (const log of mealLogs) {
      const key = log.meal_date.slice(0, 10);
      (groups[key] ??= []).push(log);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((dateKey) => {
        const meals = [...groups[dateKey]].sort(
          (a, b) => mealTypeRank(a.meal_type) - mealTypeRank(b.meal_type),
        );
        return { dateKey, meals, totals: sumDay(meals) };
      });
  }, [mealLogs]);

  // Top 3 most-logged items.
  const goToMeals = useMemo(() => {
    const counts = {};
    for (const log of mealLogs) {
      counts[log.item_id] ??= { ...log, count: 0 };
      counts[log.item_id].count += 1;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [mealLogs]);

  const months = [...new Set(days.map((d) => d.dateKey.slice(0, 7)))];
  const activeMonth = months.includes(selectedMonth) ? selectedMonth : months[0];
  const summaryDays = days.filter((d) => d.dateKey.startsWith(activeMonth ?? ""));

  const query = search.trim().toLowerCase();
  const filteredDays = query
    ? days
        .map((day) => ({
          ...day,
          meals: day.meals.filter(
            (m) =>
              m.name?.toLowerCase().includes(query) ||
              m.restaurant?.toLowerCase().includes(query),
          ),
        }))
        .filter((day) => day.meals.length > 0)
    : days;

  const header = (
    <PageHeader
      eyebrow="Your food journal"
      title="Meal history"
      subtitle="Look back at your meals. Bring back your favorites."
      onLogMeal={onLogMeal}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <div className="dm-card dm-empty">Loading your meals…</div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {header}
        <div className="dm-card">
          <p className="dm-alert dm-alert-error" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            className="dm-btn dm-btn-secondary"
            style={{ marginTop: 16 }}
            onClick={() => fetchMealHistory()}
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div role="status" aria-live="polite">
        {status.text && (
          <p className={`dm-alert dm-alert-${status.type}`} style={{ marginBottom: 20 }}>
            {status.text}
          </p>
        )}
      </div>

      {/* Go-to meals */}
      <div className="dm-section-head" style={{ marginTop: 0 }}>
        <div>
          <h2 className="dm-section-title">Your go-to meals</h2>
          <p className="dm-section-sub">Familiar favorites, one tap away.</p>
        </div>
      </div>

      {goToMeals.length === 0 ? (
        <div className="dm-card dm-empty">Your most-logged meals will show up here.</div>
      ) : (
        <div className="dm-goto-grid">
          {goToMeals.map((meal) => {
            const key = `goto-${meal.item_id}`;
            return (
              <article className="dm-card dm-goto-card" key={key}>
                <span className="dm-chip dm-chip-blue" style={{ alignSelf: "flex-start" }}>
                  Logged {meal.count} {meal.count === 1 ? "time" : "times"}
                </span>
                <h3 className="dm-goto-name">{meal.name}</h3>
                <p className="dm-goto-place">{meal.restaurant}</p>
                <div className="dm-goto-foot">
                  <p className="dm-kcal-big">
                    {formatKcal(mealCalories(meal))}
                    <small>kcal</small>
                  </p>
                  <LogAgainButton
                    meal={meal}
                    busy={relogKey === key}
                    onRelog={(m) => handleRelog(m, key)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Daily summary */}
      <div className="dm-section-head">
        <h2 className="dm-section-title">Daily summary</h2>
        {months.length > 0 && (
          <>
            <label className="dm-sr-only" htmlFor="dm-month">
              Month
            </label>
            <select
              id="dm-month"
              className="dm-select"
              style={{ width: 180 }}
              value={activeMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {summaryDays.length === 0 ? (
        <div className="dm-card dm-empty">You haven't logged any meals yet.</div>
      ) : (
        <div className="dm-card dm-table-card">
          <table className="dm-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: "40%" }}>
                  Date
                </th>
                <th scope="col">Calories</th>
                <th scope="col">Protein</th>
                <th scope="col">Carbs</th>
                <th scope="col">Fat</th>
              </tr>
            </thead>
            <tbody>
              {summaryDays.map(({ dateKey, totals }) => (
                <tr key={dateKey}>
                  <td>{formatDate(dateKey)}</td>
                  <td>{formatKcal(totals.calories)} kcal</td>
                  <td>{totals.protein.toFixed(1)} g</td>
                  <td>{totals.carbs.toFixed(1)} g</td>
                  <td>{totals.fat.toFixed(1)} g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All meals */}
      <div className="dm-section-head">
        <h2 className="dm-section-title">All meals</h2>
        <div className="dm-search">
          <IconSearch size={16} className="dm-input-search-icon" />
          <label className="dm-sr-only" htmlFor="dm-meal-search">
            Search meals or dining locations
          </label>
          <input
            id="dm-meal-search"
            className="dm-input dm-input-search"
            type="search"
            placeholder="Search meals or dining locations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {days.length === 0 ? (
        <div className="dm-card dm-empty">Meals you log will appear here, grouped by day.</div>
      ) : filteredDays.length === 0 ? (
        <div className="dm-card dm-empty">No meals match “{search.trim()}”.</div>
      ) : (
        filteredDays.map(({ dateKey, meals }) => {
          const dayTotal = days.find((d) => d.dateKey === dateKey).totals.calories;
          return (
            <section className="dm-card dm-day-card" key={dateKey} aria-label={formatDate(dateKey)}>
              <div className="dm-day-head">
                <h3 className="dm-day-title">{formatDate(dateKey)}</h3>
                <span className="dm-chip dm-chip-blue">{formatKcal(dayTotal)} kcal total</span>
              </div>
              {meals.map((meal) => {
                const key = `log-${meal.id}`;
                return (
                  <div className="dm-meal-row" key={meal.id}>
                    <MealTypeTag type={meal.meal_type} />
                    <div>
                      <p className="dm-meal-name">{meal.name}</p>
                      <p className="dm-meal-meta">
                        {meal.restaurant} · Quantity: {Number(meal.quantity).toFixed(2)}
                      </p>
                    </div>
                    <p className="dm-meal-kcal">{formatKcal(mealCalories(meal))} kcal</p>
                    <LogAgainButton
                      meal={meal}
                      busy={relogKey === key}
                      onRelog={(m) => handleRelog(m, key)}
                    />
                  </div>
                );
              })}
            </section>
          );
        })
      )}
    </>
  );
}
