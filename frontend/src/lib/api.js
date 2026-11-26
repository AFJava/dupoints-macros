// (Written with help from Claude, an LLM.)
// Shared helpers for calling our Express API.

import { supabase } from "./supabaseClient.js";

export const API_URL = "http://localhost:3001";

// fetch() with the logged-in user's token attached.
export async function authFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in.");

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
}

// GET a JSON endpoint and throw the API's error message if it fails.
export async function getJson(path) {
  const response = await authFetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// Today's date as YYYY-MM-DD in the user's own time zone.
// (toISOString() would use UTC, which is already "tomorrow" late at night in Durham.)
export function localDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

// "2026-11-25" shifted by n days, still as a local YYYY-MM-DD string.
export function shiftDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  return localDateString(new Date(year, month - 1, day + days));
}
