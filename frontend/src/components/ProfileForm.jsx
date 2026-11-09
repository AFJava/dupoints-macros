// (Written with help from Claude, an LLM. Checked by us.)

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";

const API_URL = "http://localhost:3001";

// Builds the headers for a request to our Express API, including the logged-in user's token.
async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export default function ProfileForm() {
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [goal, setGoal] = useState("maintain");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // BMI = weight (kg) / height (m) squared. Only shown when both numbers are valid.
  const heightM = Number(heightCm) / 100;
  const bmi =
    Number(weightKg) > 0 && heightM > 0
      ? (Number(weightKg) / (heightM * heightM)).toFixed(1)
      : null;

  // When the page opens, load the saved profile (if there is one) into the form.
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
          setError(data.error);
          return;
        }

        setAge(String(data.age));
        setHeightCm(String(data.height_cm));
        setWeightKg(String(data.body_weight_kg));
        setActivityLevel(String(data.activity_level));
        setGoal(data.goal);
      } catch {
        setError("Could not reach the server.");
      }
    }

    loadProfile();
  }, []);

  async function handleSave(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          age: Number(age),
          height_cm: Number(heightCm),
          body_weight_kg: Number(weightKg),
          activity_level: Number(activityLevel),
          goal: goal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
      } else {
        setMessage("Profile saved!");
      }
    } catch {
      setError("Could not reach the server.");
    }
  }

  return (
    <div className="profile">
      <h1>Your Profile</h1>
      <p>
        Enter your background information. This will be used to set your daily
        nutrition targets.
      </p>
      <form onSubmit={handleSave}>
        <input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Height (cm)"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Weight (kg)"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Workout days per week (0-7)"
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
          required
        />
        <select value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="lose">Lose weight</option>
          <option value="maintain">Maintain</option>
          <option value="gain">Gain weight</option>
        </select>
        <button type="submit">Save</button>
      </form>
      {bmi && <p>Your BMI: {bmi}</p>}
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </div>
  );
}
