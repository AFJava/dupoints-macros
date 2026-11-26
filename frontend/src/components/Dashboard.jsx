// (Written with help from Claude, an LLM.)

import { useEffect, useState } from "react";
import AppLayout, { PageHeader } from "./AppLayout.jsx";
import MealHistory from "./MealHistory.jsx";
import ProfileForm from "./ProfileForm.jsx";
import FoodPointsSection from "./FoodPointsSection.jsx";
import LogMealDialog from "./LogMealDialog.jsx";
import { authFetch, getJson, localDateString, shiftDays } from "../lib/api.js";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Fallback when the user hasn't saved a profile yet:
// FDA Daily Values for a 2,000-calorie diet.
const DEFAULT_TARGETS = { calories: 2000, protein: 50, carbs: 275, fat: 78, fiber: 28 };

const TARGET_NOTES = {
  recommended: "Targets are estimated from your profile.",
  custom: "Using your custom calorie goal.",
  default: "Standard 2,000-calorie targets. Save your profile for personal ones.",
};

// /api/profile -> targets in the shape the card uses, or null if there's no profile.
async function loadTargets() {
  const response = await authFetch("/api/profile");
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load your targets.");
  const t = data.targets;
  return {
    calories: t.calories,
    protein: t.protein_g,
    carbs: t.carbs_g,
    fat: t.fat_g,
    fiber: t.fiber_g,
    source: t.source,
  };
}

const COLORS = {
  calories: "#2f5bd3",
  protein: "#1f8a5b",
  carbs: "#2f5bd3",
  fats: "#c48a1c",
  trendCalories: "#5f87d6",
  trendProtein: "#6fa98a",
  track: "#eceff5",
};

const formatNumber = (n) => Math.round(Number(n)).toLocaleString("en-US");

// Percent of goal, clamped to 0-100 so bars never overflow (and no divide-by-zero).
function percentOf(eaten, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min(100, Math.max(0, (eaten / goal) * 100));
}

// "2026-11-19" -> "Nov 19" or "Nov"
function formatDay(dateString, options = { month: "short", day: "numeric" }) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", options);
}

function Meter({ label, eaten, goal, unit, color }) {
  return (
    <div>
      <div className="dm-meter-row">
        <span className="dm-meter-label">{label}</span>
        <span className="dm-meter-value">
          {formatNumber(eaten)} / {formatNumber(goal)} {unit}
        </span>
      </div>
      <div
        className="dm-meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.round(eaten)}
      >
        <div
          className="dm-meter-fill"
          style={{ width: `${percentOf(eaten, goal)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function DailyIntakeCard() {
  const [totals, setTotals] = useState(null);
  const [targets, setTargets] = useState(null);
  const [error, setError] = useState("");

  // Today's totals from /api/meal-totals, and targets from the profile.
  useEffect(() => {
    let cancelled = false;
    async function loadToday() {
      try {
        const today = localDateString();
        const [data, profileTargets] = await Promise.all([
          getJson(
            `/api/meal-totals?nutrients=calories,protein,carbs,fat,fiber&start_date=${today}&end_date=${today}`,
          ),
          loadTargets(),
        ]);
        if (!cancelled) {
          setTotals(data.totals);
          setTargets(profileTargets ?? { ...DEFAULT_TARGETS, source: "default" });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message);
      }
    }
    loadToday();
    return () => {
      cancelled = true;
    };
  }, []);

  const eaten = totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const goal = targets ?? { ...DEFAULT_TARGETS, source: "default" };
  const remaining = goal.calories - eaten.calories;
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  let remainingText = `${formatNumber(remaining)} kcal remaining`;
  if (!totals && !error) remainingText = "Loading today's meals…";
  else if (remaining < 0) remainingText = `${formatNumber(-remaining)} kcal over goal`;

  return (
    <section className="dm-card">
      <div className="dm-card-head">
        <h2 className="dm-card-title">Daily intake</h2>
        <span className="dm-chip">{dateLabel}</span>
      </div>

      {error && (
        <p className="dm-alert dm-alert-error" role="alert" style={{ marginBottom: 20 }}>
          Couldn't load today's meals: {error}
        </p>
      )}

      <div className="dm-intake-body">
        <div>
          <div className="dm-ring">
            <CircularProgressbarWithChildren
              value={percentOf(eaten.calories, goal.calories)}
              strokeWidth={8}
              styles={buildStyles({
                pathColor: COLORS.calories,
                trailColor: COLORS.track,
                strokeLinecap: "butt",
              })}
            >
              <span className="dm-ring-value">{formatNumber(eaten.calories)}</span>
              <span className="dm-ring-goal">of {formatNumber(goal.calories)} kcal</span>
            </CircularProgressbarWithChildren>
          </div>
          <p className={`dm-ring-remaining${remaining < 0 ? " is-over" : ""}`} aria-live="polite">
            {remainingText}
          </p>
        </div>

        <div className="dm-meters">
          <Meter label="Protein" unit="g" color={COLORS.protein} eaten={eaten.protein} goal={goal.protein} />
          <Meter label="Carbs" unit="g" color={COLORS.carbs} eaten={eaten.carbs} goal={goal.carbs} />
          <Meter label="Fats" unit="g" color={COLORS.fats} eaten={eaten.fat} goal={goal.fat} />
          <div className="dm-intake-extra">
            <span>
              Fiber
              <strong>
                {formatNumber(eaten.fiber)} / {goal.fiber} g
              </strong>
            </span>
            {targets && <span>{TARGET_NOTES[targets.source]}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

// Four bars: the last 4 weeks (7 days each, ending today) or the last 4 months.
async function loadTrends(view) {
  const today = localDateString();
  let anchors;
  if (view === "weekly") {
    anchors = [21, 14, 7, 0].map((daysAgo) => shiftDays(today, -daysAgo));
  } else {
    const now = new Date();
    anchors = [3, 2, 1, 0].map((monthsAgo) =>
      localDateString(new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)),
    );
  }

  const period = view === "weekly" ? "week" : "month";
  const results = await Promise.all(
    anchors.map((date) =>
      getJson(`/api/trends?period=${period}&date=${date}&nutrients=calories,protein`),
    ),
  );

  return results.map((r) => ({
    label: view === "weekly" ? formatDay(r.start_date) : formatDay(r.start_date, { month: "short" }),
    calories: r.averages.calories,
    protein: r.averages.protein,
    daysLogged: r.days_logged,
  }));
}

function TrendCard({ title, unit, data, error, dataKey, color, valueSuffix }) {
  const hasData = data?.some((row) => row.daysLogged > 0);

  return (
    <section className="dm-card">
      <div className="dm-card-head">
        <h3 className="dm-card-title">{title}</h3>
      </div>
      <p className="dm-chart-unit">{unit}</p>

      {error ? (
        <p className="dm-alert dm-alert-error" role="alert">
          Couldn't load trends: {error}
        </p>
      ) : !data ? (
        <p className="dm-empty">Loading trends…</p>
      ) : !hasData ? (
        <p className="dm-empty">Log a few meals to see your trends here.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.track} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5d6779", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#5d6779", fontSize: 12 }}
              tickCount={3}
              tickFormatter={formatNumber}
            />
            <Tooltip
              cursor={{ fill: "rgba(47, 91, 211, 0.06)" }}
              formatter={(value, _name, item) => [
                `${formatNumber(value)} ${valueSuffix} (${item.payload.daysLogged} days logged)`,
                "Average",
              ]}
            />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function Overview({ onLogMeal }) {
  const [view, setView] = useState("weekly");
  const [trendData, setTrendData] = useState({}); // cached per view
  const [trendError, setTrendError] = useState("");

  useEffect(() => {
    if (trendData[view]) return;
    let cancelled = false;
    setTrendError("");
    loadTrends(view)
      .then((data) => {
        if (!cancelled) setTrendData((prev) => ({ ...prev, [view]: data }));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setTrendError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [view, trendData]);

  const trends = trendData[view];

  return (
    <>
      <PageHeader
        eyebrow="Your daily overview"
        title="Good food. Better balance."
        subtitle="Your nutrition and food points, at a glance."
        onLogMeal={onLogMeal}
      />

      {/* FoodPointsSection renders three cards (balance, chart, meal plan) that
          slot into this grid next to the intake card. */}
      <div className="dm-overview-grid">
        <DailyIntakeCard />
        <FoodPointsSection />
      </div>

      <div className="dm-section-head">
        <div>
          <h2 className="dm-section-title">A little perspective</h2>
          <p className="dm-section-sub">
            Your nutrition trends over time. Averages count only days with logged meals.
          </p>
        </div>
        <div className="dm-segmented" role="group" aria-label="Trend range">
          <button
            type="button"
            aria-pressed={view === "weekly"}
            onClick={() => setView("weekly")}
          >
            Weekly
          </button>
          <button
            type="button"
            aria-pressed={view === "monthly"}
            onClick={() => setView("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="dm-trends-grid">
        <TrendCard
          title="Average calories per day"
          unit={view === "weekly" ? "kcal / day · weeks starting" : "kcal / day"}
          data={trends}
          error={trendError}
          dataKey="calories"
          color={COLORS.trendCalories}
          valueSuffix="kcal"
        />
        <TrendCard
          title="Average protein per day"
          unit={view === "weekly" ? "grams / day · weeks starting" : "grams / day"}
          data={trends}
          error={trendError}
          dataKey="protein"
          color={COLORS.trendProtein}
          valueSuffix="g"
        />
      </div>
    </>
  );
}

export default function Dashboard({ onLogout }) {
  const [currentPage, setCurrentPage] = useState("home");
  const [logOpen, setLogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumping it reloads the current page's data
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openLogMeal = () => setLogOpen(true);

  function handleLogged(item) {
    setLogOpen(false);
    setRefreshKey((k) => k + 1);
    setToast(`Logged ${item.name}.`);
  }

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage} onLogout={onLogout}>
      {currentPage === "profile" ? (
        <ProfileForm />
      ) : currentPage === "history" ? (
        <MealHistory key={refreshKey} onLogMeal={openLogMeal} />
      ) : (
        <Overview key={refreshKey} onLogMeal={openLogMeal} />
      )}

      {logOpen && <LogMealDialog onClose={() => setLogOpen(false)} onLogged={handleLogged} />}

      <div className="dm-toast-region" role="status" aria-live="polite">
        {toast && <div className="dm-toast">{toast}</div>}
      </div>
    </AppLayout>
  );
}
