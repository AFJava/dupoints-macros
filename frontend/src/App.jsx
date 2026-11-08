import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";
import Dashboard from "./components/Dashboard.jsx";
import Login from "./components/Login.jsx";
import SignUp from "./components/SignUp.jsx";

export default function App() {
  // Session state, signUp, and loading for Supabase authentication.
  const [session, setSession] = useState(null); // Starts as null (not logged in).
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to log the user out of Supabase.
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error logging out:", error.message);
    }
  }

  // Set up an effect to listen for auth state changes and update the session state accordingly.
  useEffect(() => {
    // Check if the user is logged in when the app loads.
    async function getUserSession() {
      try {
        // Retrieve the current session from Supabase.
        const { data, error } = await supabase.auth.getSession();

        // Log an error if Supabase returns an error while retrieving the session.
        if (error) {
          console.error("Error retrieving session:", error.message);
        }

        // If the user is logged in, set the session state to the current session.
        setSession(data.session);
      } catch (error) {
        // Handle unexpected errors that may occur during the session check.
        console.error("Unexpected session error:", error);
      } finally {
        // Set loading to false after checking the session, even if an error occurs.
        setIsLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    getUserSession();

    // Clean up the subscription when the component unmounts.
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="App">
      {/*
        Checks if site is loading. If loading, show the loading screen.
        Next it checks if a session exists. If it does, render the Dashboard.
        If not, check whether the user wants to sign up or log in.
      */}
      {isLoading ? (
        <p>Loading...</p>
      ) : session ? (
        <Dashboard onLogout={handleLogout} />
      ) : showSignUp ? (
        <SignUp setShowSignUp={setShowSignUp} />
      ) : (
        <Login setShowSignUp={setShowSignUp} />
      )}
    </div>
  );
}
