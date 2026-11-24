import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Recharts is a library that draws bar charts for us.
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Rectangle
} from "recharts";

const API_URL = "http://localhost:3001";

// Meal plans from the Duke Dining chart.
const mealPlans = [
  { value: "A", label: "Plan A (Upperclass)" },
  { value: "B", label: "Plan B (Upperclass)" },
  { value: "C", label: "Plan C (Upperclass)" },
  { value: "D", label: "Plan D (Upperclass)" },
  { value: "E", label: "Plan E (Upperclass)" },
  { value: "F", label: "Plan F (Off-Campus / Commuter)" },
  { value: "I", label: "Plan I (First Year)" },
  { value: "J", label: "Plan J (Swift)" },
];

// Format a food point amount like "2,879.33".
function formatPoints(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export default function FoodPointsSection() {
  const [plan, setPlan] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");

  // When the dashboard opens, start with the plan saved on the profile (if any).
  useEffect(() => {
    async function loadSavedPlan() {
      try {
        const data = await fetchSchedule();

        if (data) {
          setPlan(data.plan_letter);
          setSchedule(data);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    }

    loadSavedPlan();
  }, []);

  // When a different plan is picked, load its schedule.
  async function handlePlanChange(event) {
    const newPlan = event.target.value;

    setPlan(newPlan);
    setError("");

    if (!newPlan) {
      setSchedule(null);
      return;
    }

    try {
      setSchedule(await fetchSchedule(newPlan));
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  const balanceAmount = currentBalance.trim() === "" ? null : Number(currentBalance);
  const balanceIsValid = balanceAmount !== null && Number.isFinite(balanceAmount) && balanceAmount >= 0;
  const expectedToday = schedule
    ? Number(schedule.semester_status === "not_started" ? schedule.total
      : schedule.semester_status === "ended" ? 0 : schedule.expected_remaining_today)
    : null;
  // Only the current week gets an actualBalance, and only if we have one
  const hasActual =
    currentBalance !== null &&
    currentBalance !== undefined &&
    currentBalance !== "" &&
    !Number.isNaN(Number(currentBalance));

  const chartData = schedule
    ? schedule.schedule.map((row) => ({
        week: formatWeekStart(row.week_start),
        weekNumber: row.week,
        balance: Number(row.expected_remaining),
        actualBalance:
          hasActual && Number(row.week) === Number(schedule.current_week)
            ? Number(currentBalance)
            : null,
      }))
    : [];
  
  const actualColor =
    hasActual && Number(currentBalance) >= Number(schedule?.expected_remaining_today)
      ? "#16803c"
      : "#c62828";
    
  const BAR_SIZE = 24;
    
  return (
    <>
      <h1>Food Points</h1>
      
      {!error && <>
        <label>Pick a meal plan to see your expected food points:
          <select style={ {marginLeft: "0.5rem"} } value={plan} onChange={handlePlanChange}>
            <option value="">Select your meal plan</option>
            {mealPlans.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <br></br>
      </>}
      
      {!error && <>
        <label id="balance-status" aria-live="polite">
          {currentBalance !== "" && !balanceIsValid
            ? "Enter a valid balance of zero or more."
            : "Enter your current balance to compare it with your plan:"}
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1250.50"
            value={currentBalance}
            onChange={(event) => setCurrentBalance(event.target.value)}
            aria-describedby="balance-status"
            style={ {marginLeft: "0.5rem"} }
          />
        </label>
        <br></br>
      </>}

      {/* 
        `Your balance:  — ${
          balanceAmount < expectedToday ? "below" : "at or above"
        } today's expected balance of ${formatPoints(expectedToday)}.`
      */}

      {error && <p className="error">{error}</p>}

      {schedule && schedule.semester_status === "not_started" && (
        <p>
          The semester hasn't started yet. Your Plan {schedule.plan_letter} starting balance is{" "}
          {formatPoints(schedule.total)} food points.
        </p>
      )}

      {schedule && schedule.semester_status === "ended" && (
        <p>The semester has ended, so the expected balance is 0.00 food points.</p>
      )}

      {schedule && schedule.semester_status === "in_progress" && 
        <>
          <p>
            Following Plan {schedule.plan_letter}'s recommended pace of{" "}
            {formatPoints(schedule.daily_amount)} per day, you should have about{" "}
            {formatPoints(schedule.expected_remaining_today)} food points left today (out of{" "}
            {formatPoints(schedule.total)}).
          </p>

          {balanceIsValid &&
            <>
              <p>
                At your current balance of {formatPoints(balanceAmount)} food points, you
                {balanceAmount < expectedToday ? " will not" : " will"} have enough food points
                for the remainder of the semester.
              </p>
              {/*
              <p>
                Based on your balance, you can spend {} per day
                without running out of food points.
              </p>
              */}
            </>
          }
        </>
      }

      {schedule && (
        <>
          {/* The current week is highlighted in green. */}
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} barSize={BAR_SIZE} barGap={-BAR_SIZE}>
              <XAxis dataKey="week" interval={0} height={60}
                tick={({ x, y, payload, index }) => (
                  <text
                    x={x}
                    y={y + (index % 2 === 0 ? 14 : 30)}
                    textAnchor="middle"
                    fill="#666"
                    fontSize={16}
                  >
                    {payload.value}
                  </text>)}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatPoints(value)} />

              <Bar dataKey="balance" name="Expected balance" fill="#012169" isAnimationActive={false}>
                {chartData.map((row) => (
                  <Cell
                    key={row.weekNumber}
                    fill={row.weekNumber === schedule.current_week ? "#22a06b" : "#012169"}
                  />
                ))}
              </Bar>

              <Bar
                dataKey="actualBalance"
                name="Your current balance"
                fill={actualColor}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>

          <p>
            Based on Duke Dining's chart for the recommended spending pace.
          </p>
        </>
      )}
    </>
  );
}
