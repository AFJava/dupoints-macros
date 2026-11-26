// (Written with help from Claude, an LLM.)

import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import AuthLayout from "./AuthLayout.jsx";
import { IconEye, IconEyeOff } from "./Icons.jsx";

export default function Login({ setShowSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault(); // Keep the browser from reloading the page.
    setError("");
    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      // On success, the auth listener in App swaps this screen for the dashboard.
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <p className="dm-eyebrow">Welcome back</p>
      <h1 className="dm-title">Log in to DukeMeals</h1>
      <p className="dm-subtitle">Pick up where you left off.</p>

      <form className="dm-auth-form" onSubmit={handleLogin}>
        <div className="dm-field">
          <label className="dm-label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            className="dm-input dm-input-lg"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="dm-field">
          <label className="dm-label" htmlFor="login-password">
            Password
          </label>
          <div className="dm-input-wrap">
            <input
              id="login-password"
              className="dm-input dm-input-lg"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="dm-input-icon-btn"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="dm-alert dm-alert-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="dm-btn dm-btn-primary dm-btn-block dm-btn-lg"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="dm-auth-switch">
        Don't have an account?{" "}
        <button type="button" className="dm-link" onClick={() => setShowSignUp(true)}>
          Sign up
        </button>
      </p>
    </AuthLayout>
  );
}
