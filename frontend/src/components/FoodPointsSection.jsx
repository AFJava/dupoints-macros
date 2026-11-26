// (Written with help from Claude, an LLM.)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { API_URL, authFetch } from "../lib/api.js";

import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


// Meal plans from the Duke Dining chart.
export const mealPlans = [
  { value: "A", label: "Plan A (Upperclass)" },
  { value: "B", label: "Plan B (Upperclass)" },
  { value: "C", label: "Plan C (Upperclass)" },
  { value: "D", label: "Plan D (Upperclass)" },
  { value: "E", label: "Plan E (Upperclass)" },
  { value: "F", label: "Plan F (Off-Campus / Commuter)" },
  { value: "I", label: "Plan I (First Year)" },
  { value: "J", label: "Plan J (Swift)" },
];

const BAR_COLORS = { past: "#6d88c4", current: "#1f8a5b", future: "#d6dff1" };

// "Plan D (Upperclass)" -> "Plan D · Upperclass"
function shortPlanLabel(letter) {
  const plan = mealPlans.find((p) => p.value === letter);
  if (!plan) return `Plan ${letter}`;
  return plan.label.replace(/\s*\((.*)\)$/, " · $1");
}

// Format a food point amount like "2,879.33".
export function formatPoints(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Four evenly spaced y-axis ticks on a round step, e.g. 0 / 1.5k / 3k / 4.5k.
function axisTicks(maxValue) {
  const steps = [250, 500, 1000, 1500, 2000, 2500, 5000];
  const step = steps.find((s) => s * 3 >= maxValue) ?? Math.ceil(maxValue / 3);
  return [0, step, step * 2, step * 3];
}

// 4500 -> "4.5k", 3000 -> "3k"
function formatAxisPoints(value) {
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))}k`;
  return String(value);
}

// Format "2026-08-31" as "Aug 31" (parsed as a local date to avoid off-by-one-day errors).
function formatWeekStart(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Loads the expected food point schedule. With no plan, the API uses the plan saved on the
// user's profile (and returns 404 if there isn't one). With a plan letter, it uses that plan.
// "Updated Nov 25" / "Updated today"
function formatUpdated(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) return "Updated today";
  return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

async function fetchSchedule(planLetter) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in to view food points.");
  }

  const query = planLetter ? `?plan=${planLetter}` : "";
  const response = await fetch(`${API_URL}/api/spending/schedule${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  // 404 just means no plan is saved yet.
  if (response.status === 404) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load food points.");
  }
  return data;
}

// Expected balance right now, accounting for before/after the semester.
function expectedBalanceToday(schedule) {
  if (!schedule) return null;
  if (schedule.semester_status === "not_started") return Number(schedule.total);
  if (schedule.semester_status === "ended") return 0;
  return Number(schedule.expected_remaining_today);
}

function BalanceCard({ schedule, balance, updatedAt, onSaveBalance }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const draftNumber = Number(draft);
  const draftValid = draft.trim() !== "" && Number.isFinite(draftNumber) && draftNumber >= 0;

  const expected = expectedBalanceToday(schedule);
  const inProgress = schedule?.semester_status === "in_progress";
  const hasBalance = balance !== null;
  const difference = hasBalance && expected !== null ? balance - expected : null;
  const onTrack = difference !== null && difference >= 0;

  function startEditing() {
    setDraft(hasBalance ? String(balance) : "");
    setEditing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draftValid) return;

    setSaving(true);
    setSaveError("");
    try {
      await onSaveBalance(Math.round(draftNumber * 100) / 100);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  let paceTitle = "Add your current balance";
  let paceText = "We'll compare it with your plan's recommended pace.";
  if (schedule?.semester_status === "not_started") {
    paceTitle = "The semester hasn't started yet";
    paceText = `Plan ${schedule.plan_letter} starts with ${formatPoints(schedule.total)} points.`;
  } else if (schedule?.semester_status === "ended") {
    paceTitle = "The semester has ended";
    paceText = "Your expected balance is now 0.00 points.";
  } else if (!schedule) {
    paceTitle = "Choose a meal plan";
    paceText = "Pick your plan to see how your balance compares.";
  } else if (difference !== null) {
    paceTitle = `${formatPoints(Math.abs(difference))} pts ${onTrack ? "ahead of" : "behind"} pace`;
    paceText = onTrack
      ? "Enough to cover the rest of your semester."
      : "At this rate you may run out before the semester ends.";
  }

  return (
    <section className="dm-card dm-points-hero" aria-labelledby="dm-points-label">
      <div className="dm-card-head" style={{ marginBottom: 0 }}>
        <h2 id="dm-points-label" className="dm-points-label">
          Food points
        </h2>
        {inProgress && difference !== null && (
          <span className={`dm-chip ${onTrack ? "dm-chip-green" : "dm-chip-amber"}`}>
            {onTrack ? "On track" : "Below pace"}
          </span>
        )}
      </div>

      <p className="dm-points-balance">{hasBalance ? formatPoints(balance) : "—"}</p>
      <p className="dm-points-caption">
        Current balance{hasBalance && updatedAt ? ` · ${formatUpdated(updatedAt)}` : ""}
      </p>

      <div className="dm-points-divider" />
      <p className="dm-points-pace">{paceTitle}</p>
      <p className="dm-points-caption">{paceText}</p>

      <div className="dm-points-actions">
        {editing ? (
          <form className="dm-points-edit" onSubmit={handleSubmit} noValidate>
            <label className="dm-sr-only" htmlFor="dm-balance-input">
              Current food points balance
            </label>
            <input
              id="dm-balance-input"
              className="dm-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 1250.50"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={draft !== "" && !draftValid}
              autoFocus
            />
            {draft !== "" && !draftValid && (
              <p className="dm-points-error">Enter a balance of zero or more.</p>
            )}
            {saveError && (
              <p className="dm-points-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="dm-points-edit-row">
              <button
                type="button"
                className="dm-btn dm-btn-ghost-light"
                onClick={() => {
                  setEditing(false);
                  setSaveError("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="dm-btn dm-btn-light"
                disabled={!draftValid || saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="dm-btn dm-btn-light dm-btn-block" onClick={startEditing}>
            {hasBalance ? "Update balance" : "Add balance"}
          </button>
        )}
      </div>
    </section>
  );
}

function ScheduleChartCard({ schedule, loading }) {
  const status = schedule?.semester_status;
  const currentWeek = Number(schedule?.current_week);

  const chartData = schedule
    ? schedule.schedule.map((row) => {
        const week = Number(row.week);
        let phase = "future";
        if (status === "ended" || (status === "in_progress" && week < currentWeek)) phase = "past";
        if (status === "in_progress" && week === currentWeek) phase = "current";
        return {
          week: formatWeekStart(row.week_start),
          weekNumber: week,
          balance: Number(row.expected_remaining),
          phase,
        };
      })
    : [];

  const yTicks = axisTicks(Math.max(1, ...chartData.map((row) => row.balance)));

  // Label roughly every 4th week, plus the current week and the last week.
  const lastIndex = chartData.length - 1;
  const currentIndex = chartData.findIndex((row) => row.phase === "current");
  const labelIndexes = new Set([lastIndex]);
  for (let i = 0; i <= lastIndex; i += 4) labelIndexes.add(i);
  if (currentIndex >= 0) {
    // Drop neighbors that would overlap the current-week label.
    [currentIndex - 1, currentIndex + 1, currentIndex - 2, currentIndex + 2].forEach((i) =>
      labelIndexes.delete(i),
    );
    labelIndexes.add(currentIndex);
  }
  if (labelIndexes.has(lastIndex - 1)) labelIndexes.delete(lastIndex - 1);
  labelIndexes.add(lastIndex);

  return (
    <section className="dm-card">
      <div className="dm-card-head">
        <div>
          <h2 className="dm-card-title">Make your points last</h2>
          <p className="dm-card-sub">Recommended balance across the semester</p>
        </div>
        {schedule && <span className="dm-chip">{shortPlanLabel(schedule.plan_letter)}</span>}
      </div>

      {loading ? (
        <p className="dm-empty">Loading your plan…</p>
      ) : !schedule ? (
        <p className="dm-empty">Pick a meal plan to see your recommended balance.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eceff5" />
              <XAxis
                dataKey="week"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#5d6779", fontSize: 12 }}
                tickFormatter={(value, index) => (labelIndexes.has(index) ? value : "")}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#5d6779", fontSize: 12 }}
                tickFormatter={formatAxisPoints}
                ticks={yTicks}
                domain={[0, yTicks[3]]}
                width={44}
              />
              <Tooltip
                cursor={{ fill: "rgba(47, 91, 211, 0.06)" }}
                formatter={(value) => [`${formatPoints(value)} pts`, "Expected balance"]}
                labelFormatter={(label) => `Week of ${label}`}
              />
              <Bar dataKey="balance" radius={[5, 5, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                {chartData.map((row) => (
                  <Cell key={row.weekNumber} fill={BAR_COLORS[row.phase]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="dm-card-foot">Based on Duke Dining's recommended spending pace.</p>
        </>
      )}
    </section>
  );
}

function MealPlanCard({ plan, savedPlan, schedule, balance, error, onPlanChange }) {
  const expected = expectedBalanceToday(schedule);
  const inProgress = schedule?.semester_status === "in_progress";
  const previewing = savedPlan && plan && plan !== savedPlan;

  let note = null;
  if (error) {
    note = <p className="dm-alert dm-alert-error" role="alert">{error}</p>;
  } else if (previewing) {
    note = (
      <p className="dm-alert dm-alert-info">
        Previewing Plan {plan}. Your saved plan is Plan {savedPlan}; change it in Profile.
      </p>
    );
  } else if (inProgress && balance !== null) {
    note =
      balance >= expected ? (
        <p className="dm-alert dm-alert-success">Your balance is above the recommended pace.</p>
      ) : (
        <p className="dm-alert dm-alert-warn">Your balance is below the recommended pace.</p>
      );
  } else if (inProgress) {
    note = <p className="dm-alert dm-alert-info">Add your balance to see how you compare.</p>;
  }

  return (
    <section className="dm-card">
      <h2 className="dm-card-title" style={{ marginBottom: 20 }}>
        Your meal plan
      </h2>

      <label className="dm-sr-only" htmlFor="dm-plan-select">
        Meal plan
      </label>
      <select
        id="dm-plan-select"
        className="dm-select"
        value={plan}
        onChange={(e) => onPlanChange(e.target.value)}
      >
        <option value="">Select your meal plan</option>
        {mealPlans.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {schedule && (
        <dl className="dm-plan-stats">
          <div>
            <dt>Daily spending pace</dt>
            <dd>{formatPoints(schedule.daily_amount)} pts</dd>
          </div>
          <div>
            <dt>Expected balance today</dt>
            <dd>{formatPoints(expected)} pts</dd>
          </div>
          <div>
            <dt>Starting allocation</dt>
            <dd>{formatPoints(schedule.total)} pts</dd>
          </div>
        </dl>
      )}

      <div style={{ marginTop: schedule ? 0 : 20 }}>{note}</div>
    </section>
  );
}

export default function FoodPointsSection() {
  const [plan, setPlan] = useState("");
  const [savedPlan, setSavedPlan] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(null);

  // Load the balance saved on the profile (if any).
  useEffect(() => {
    async function loadSavedBalance() {
      try {
        const response = await authFetch("/api/profile");
        if (!response.ok) return; // 404 = no profile yet, so no balance either
        const profile = await response.json();
        if (profile.current_balance !== null && profile.current_balance !== undefined) {
          setBalance(Number(profile.current_balance)); // pg returns numeric as a string
          setBalanceUpdatedAt(profile.balance_updated_at);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSavedBalance();
  }, []);

  // Save a new balance to the profile. Throws so the card can show the error.
  async function saveBalance(amount) {
    const response = await authFetch("/api/profile/balance", {
      method: "PATCH",
      body: JSON.stringify({ current_balance: amount }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save your balance.");

    setBalance(Number(data.current_balance));
    setBalanceUpdatedAt(data.balance_updated_at);
  }

  // Start with the plan saved on the profile (if any).
  useEffect(() => {
    async function loadSavedPlan() {
      try {
        const data = await fetchSchedule();
        if (data) {
          setPlan(data.plan_letter);
          setSavedPlan(data.plan_letter);
          setSchedule(data);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSavedPlan();
  }, []);

  async function handlePlanChange(newPlan) {
    setPlan(newPlan);
    setError("");

    if (!newPlan) {
      setSchedule(null);
      return;
    }

    try {
      setLoading(true);
      setSchedule(await fetchSchedule(newPlan));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BalanceCard
        schedule={schedule}
        balance={balance}
        updatedAt={balanceUpdatedAt}
        onSaveBalance={saveBalance}
      />
      <ScheduleChartCard schedule={schedule} loading={loading} />
      <MealPlanCard
        plan={plan}
        savedPlan={savedPlan}
        schedule={schedule}
        balance={balance}
        error={error}
        onPlanChange={handlePlanChange}
      />
    </>
  );
}
