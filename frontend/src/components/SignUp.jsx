import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function SignUp({ setShowSignUp }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [netid, setNetid] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignUp(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          netid: netid,
        },
      },
    });

    if (authError) {
      setError(authError.message);
    } else if (data.session) {
      setMessage("Account created successfully!");
    } else {
      setMessage(
        "Account created! Please check your email to confirm your account before logging in.",
      );
    }
  }

  return (
    <div className="signup">
      <h1>Sign Up</h1>
      <p>
        Please enter your first name, last name, NetID, email and password to
        create an account. If you already have an account, you can log in.
      </p>
      <form onSubmit={handleSignUp}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="NetID"
          value={netid}
          onChange={(e) => setNetid(e.target.value)}
          required
        />
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
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account?{" "}
        <button type="button" onClick={() => setShowSignUp(false)}>
          Log In
        </button>
      </p>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </div>
  );
}
