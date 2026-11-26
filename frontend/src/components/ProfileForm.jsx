// (Written with help from Claude, an LLM. Checked by us.)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { mealPlans } from "./FoodPointsSection.jsx";

const API_URL = "http://localhost:3001";

const EMPTY_PROFILE = {
  age: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  goal: "maintain",
  mealPlan: "",
  targetCalories: "", // "" = use the recommended goal
};
const NUTRITION_FIELDS = ["age", "heightCm", "weightKg", "activityLevel", "goal"];

const MIN_CALORIES = 1200;
const MAX_CALORIES = 6000;
const formatKcal = (n) => Number(n).toLocaleString("en-US");

const toField = (value) => (value === null || value === undefined ? "" : String(value));
const planLabel = (letter) =>
  mealPlans.find((p) => p.value === letter)?.label ?? (letter ? `Plan ${letter}` : "");

// Headers for our Express API, including the logged-in user's token.
async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session expired. Please log in again.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

function NumberField({ id, label, unit, value, onChange, ...inputProps }) {
  return (
    <div className="dm-field">
      <label className="dm-label" htmlFor={id}>
        {label}
      </label>
      <div className="dm-input-wrap">
        <input
          id={id}
          className="dm-input"
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          {...inputProps}
        />
        <span className="dm-input-unit">{unit}</span>
      </div>
    </div>
  );
}

export default function ProfileForm() {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recommended, setRecommended] = useState(null); // from the saved profile

  const nutritionDirty = NUTRITION_FIELDS.some((f) => form[f] !== saved[f]);
  const planDirty = form.mealPlan !== saved.mealPlan;
  const goalDirty = form.targetCalories !== saved.targetCalories;
  const dirty = nutritionDirty || planDirty || goalDirty;
  const usingCustomGoal = form.targetCalories !== "";

  // BMI = weight (kg) / height (m)^2, only when both numbers are valid.
  const heightM = Number(form.heightCm) / 100;
  const bmi =
    Number(form.weightKg) > 0 && heightM > 0
      ? (Number(form.weightKg) / (heightM * heightM)).toFixed(1)
      : null;

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: await authHeaders(),
        });

        // 404 just means no profile has been saved yet, so leave the form blank.
        if (response.status === 404) return;

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Could not load your profile.");
          return;
        }

        const loaded = {
          age: toField(data.age),
          heightCm: toField(data.height_cm),
          weightKg: toField(data.body_weight_kg),
          activityLevel: toField(data.activity_level),
          goal: data.goal || "maintain",
          mealPlan: toField(data.meal_plan_id),
          targetCalories: toField(data.target_calories),
        };
        setForm(loaded);
        setSaved(loaded);
        setRecommended(data.targets?.recommended_calories ?? null);
      } catch (err) {
        setError(err.message === "Failed to fetch" ? "Could not reach the server." : err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function update(field) {
    return (value) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setMessage("");
    };
  }

  function handleDiscard() {
    setForm(saved);
    setError("");
    setMessage("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          age: Number(form.age),
          height_cm: Number(form.heightCm),
          body_weight_kg: Number(form.weightKg),
          activity_level: Number(form.activityLevel),
          goal: form.goal,
          meal_plan_id: form.mealPlan || null,
          target_calories: usingCustomGoal ? Number(form.targetCalories) : null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not save your profile.");
      } else {
        setSaved(form);
        setRecommended(data.targets?.recommended_calories ?? null);
        setMessage("Profile saved.");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Could not reach the server." : err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="dm-page-header">
        <div>
          <p className="dm-eyebrow">Made for you</p>
          <h1 className="dm-title">Your profile</h1>
          <p className="dm-subtitle">A few details to help personalize your daily targets.</p>
        </div>
      </header>

      <div className="dm-profile-grid">
        <form className="dm-stack" onSubmit={handleSave} aria-busy={loading}>
          <section className="dm-card">
            <div className="dm-card-head">
              <div>
                <h2 className="dm-card-title">Nutrition profile</h2>
                <p className="dm-card-sub">
                  Your information is used to estimate your nutrition needs.
                </p>
              </div>
              {nutritionDirty && <span className="dm-chip dm-chip-amber">Unsaved changes</span>}
            </div>
            <hr className="dm-divider" style={{ marginTop: 0 }} />

            <div className="dm-fields-3">
              <NumberField
                id="dm-age"
                label="Age"
                unit="years"
                min="13"
                max="120"
                step="1"
                value={form.age}
                onChange={update("age")}
              />
              <NumberField
                id="dm-height"
                label="Height"
                unit="cm"
                min="50"
                max="260"
                step="0.01"
                value={form.heightCm}
                onChange={update("heightCm")}
              />
              <NumberField
                id="dm-weight"
                label="Weight"
                unit="kg"
                min="20"
                max="400"
                step="0.01"
                value={form.weightKg}
                onChange={update("weightKg")}
              />
            </div>

            <div className="dm-fields-2">
              <NumberField
                id="dm-activity"
                label="Activity level"
                unit="days / wk"
                min="0"
                max="7"
                step="1"
                placeholder="Workout days per week"
                value={form.activityLevel}
                onChange={update("activityLevel")}
              />
              <div className="dm-field">
                <label className="dm-label" htmlFor="dm-goal">
                  Nutrition goal
                </label>
                <select
                  id="dm-goal"
                  className="dm-select"
                  value={form.goal}
                  onChange={(e) => update("goal")(e.target.value)}
                >
                  <option value="lose">Lose weight</option>
                  <option value="maintain">Maintain</option>
                  <option value="gain">Gain weight</option>
                </select>
              </div>
            </div>

            <p className="dm-hint" style={{ marginTop: 28 }}>
              Activity level is how many days a week you work out (0–7). These details help set
              your daily nutrition targets.
            </p>
          </section>

          <section className="dm-card">
            <div className="dm-card-head">
              <div>
                <h2 className="dm-card-title">Daily calorie goal</h2>
                <p className="dm-card-sub">Use our recommendation, or set a goal of your own.</p>
              </div>
              {goalDirty ? (
                <span className="dm-chip dm-chip-amber">Unsaved changes</span>
              ) : (
                <span className={`dm-chip ${usingCustomGoal ? "dm-chip-blue" : "dm-chip-green"}`}>
                  {usingCustomGoal ? "Custom goal" : "Recommended"}
                </span>
              )}
            </div>

            <div className="dm-goal-row">
              <NumberField
                id="dm-calories"
                label="Calories per day"
                unit="kcal"
                min={MIN_CALORIES}
                max={MAX_CALORIES}
                step="1"
                required={false}
                placeholder={recommended ? `${recommended} (recommended)` : "e.g. 2000"}
                value={form.targetCalories}
                onChange={update("targetCalories")}
              />
              <button
                type="button"
                className="dm-btn dm-btn-secondary"
                onClick={() => update("targetCalories")("")}
                disabled={!usingCustomGoal}
              >
                Reset to recommended
              </button>
            </div>

            <p className="dm-hint" style={{ marginTop: 14 }}>
              {recommended
                ? `Recommended: ${formatKcal(recommended)} kcal/day, estimated from your saved age, height, weight, activity level and goal. Leave this blank to use it.`
                : "Save your nutrition profile to get a recommended goal."}
            </p>
            <p className="dm-hint" style={{ marginTop: 6 }}>
              Your protein, carbs and fat targets adjust to match this goal.
            </p>
          </section>

          <section className="dm-card">
            <div className="dm-card-head">
              <div>
                <h2 className="dm-card-title">Dining plan</h2>
                <p className="dm-card-sub">Keep your semester budget in sync with your meal plan.</p>
              </div>
              {planDirty && <span className="dm-chip dm-chip-amber">Unsaved changes</span>}
            </div>

            <div className="dm-field">
              <label className="dm-label" htmlFor="dm-plan">
                Meal plan
              </label>
              <select
                id="dm-plan"
                className="dm-select"
                value={form.mealPlan}
                onChange={(e) => update("mealPlan")(e.target.value)}
              >
                <option value="">Select your meal plan</option>
                {mealPlans.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="dm-hint">
                {saved.mealPlan
                  ? `Current saved plan: ${planLabel(saved.mealPlan)}`
                  : "No meal plan saved yet."}
              </p>
              {planDirty && (
                <p className="dm-hint">Save to apply this change to your food-points overview.</p>
              )}
            </div>
          </section>

          {error && (
            <p className="dm-alert dm-alert-error" role="alert">
              {error}
            </p>
          )}

          <div className="dm-form-footer">
            <p className="dm-hint" role="status" aria-live="polite">
              {message ? (
                <span style={{ color: "var(--dm-green)", fontWeight: 600 }}>{message}</span>
              ) : (
                "Changes apply when you save."
              )}
            </p>
            <div className="dm-form-footer-actions">
              <button
                type="button"
                className="dm-btn dm-btn-secondary"
                onClick={handleDiscard}
                disabled={!dirty || saving}
              >
                Discard changes
              </button>
              <button
                type="submit"
                className="dm-btn dm-btn-primary"
                disabled={!dirty || saving || loading}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>

        <aside className="dm-stack">
          <section className="dm-card">
            <h2 className="dm-card-title">Your baseline</h2>
            <p className="dm-eyebrow" style={{ marginTop: 20, marginBottom: 0 }}>
              Body mass index
            </p>
            <p className="dm-bmi">{bmi ?? "—"}</p>
            <p className="dm-hint" style={{ marginTop: 8 }}>
              {bmi
                ? "Based on the height and weight entered."
                : "Enter your height and weight to see it."}
            </p>
            <hr className="dm-divider" />
            <p className="dm-hint">
              BMI is one measure, not the full picture of your health or nutrition.
            </p>
          </section>

          <section className="dm-card dm-note-card">
            <h2 className="dm-card-title">Your goals, your pace.</h2>
            <p>
              Your profile helps tailor the targets you see in your daily overview. Update it
              whenever your needs change.
            </p>
            <strong>Make room for balance, not perfection.</strong>
          </section>
        </aside>
      </div>
    </>
  );
}
