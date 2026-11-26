// (Written with help from Claude, an LLM.)

import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import AuthLayout from "./AuthLayout.jsx";
import { IconEye, IconEyeOff } from "./Icons.jsx";

export default function SignUp({ setShowSignUp }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [netid, setNetid] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, netid },
        },
      });

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        setMessage("Account created successfully!");
      } else {
        setMessage("Account created! Check your email to confirm your account, then log in.");
        setPassword("");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <p className="dm-eyebrow">Get started</p>
      <h1 className="dm-title">Create your account</h1>
      <p className="dm-subtitle">Track your meals and food points in one place.</p>

      <form className="dm-auth-form" onSubmit={handleSignUp}>
        <div className="dm-fields-2">
          <div className="dm-field">
            <label className="dm-label" htmlFor="signup-first">
              First name
            </label>
            <input
              id="signup-first"
              className="dm-input dm-input-lg"
              type="text"
              autoComplete="given-name"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="dm-field">
            <label className="dm-label" htmlFor="signup-last">
              Last name
            </label>
            <input
              id="signup-last"
              className="dm-input dm-input-lg"
              type="text"
              autoComplete="family-name"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="dm-field">
          <label className="dm-label" htmlFor="signup-netid">
            NetID
          </label>
          <input
            id="signup-netid"
            className="dm-input dm-input-lg"
            type="text"
            autoComplete="username"
            placeholder="e.g. abc123"
            value={netid}
            onChange={(e) => setNetid(e.target.value)}
            required
          />
        </div>

        <div className="dm-field">
          <label className="dm-label" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
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
          <label className="dm-label" htmlFor="signup-password">
            Password
          </label>
          <div className="dm-input-wrap">
            <input
              id="signup-password"
              className="dm-input dm-input-lg"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              minLength={6}
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
        {message && (
          <p className="dm-alert dm-alert-success" role="status">
            {message}
          </p>
        )}

        <button
          type="submit"
          className="dm-btn dm-btn-primary dm-btn-block dm-btn-lg"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="dm-auth-switch">
        Already have an account?{" "}
        <button type="button" className="dm-link" onClick={() => setShowSignUp(false)}>
          Log in
        </button>
      </p>
    </AuthLayout>
  );
}
