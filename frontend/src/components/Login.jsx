import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

// Function to handle login with Supabase.
export default function Login({ setShowSignUp }) {
  // State variables for email, password, and error message.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault(); //Prevents browser from refreshing the page on form submission.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setError("");
    }
  }

  return (
    <div className="login">
      <h1>Login</h1>
      <p>
        Please enter your email and password to log in. If you don't have an
        account, you can sign up for one.
      </p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Log In</button>
      </form>
      <p>
        Don't have an account?{" "}
        <button type="button" onClick={() => setShowSignUp(true)}>
          Sign Up
        </button>
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
