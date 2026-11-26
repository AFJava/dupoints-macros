// (Written with help from Claude, an LLM.)
// "Log a meal" dialog: search the items table, pick one, add details, save.

import { useEffect, useState } from "react";
import { authFetch, localDateString } from "../lib/api.js";
import { createMealLog } from "../lib/mealLogs.js";
import { IconSearch } from "./Icons.jsx";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MIN_QUERY_LENGTH = 2;

const formatNumber = (n) => Math.round(Number(n)).toLocaleString("en-US");
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Guess the meal from the time of day so most people never touch the dropdown.
function defaultMealType(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < 10.5) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function SearchStep({ query, setQuery, onSelect }) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const trimmed = query.trim();

  // Debounced search: waits 250 ms after typing stops, cancels stale requests.
  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      setError("");
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await authFetch(
          `/api/items?search=${encodeURIComponent(trimmed)}&limit=20`,
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Search failed.");
        setResults(data);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  let status = null;
  if (trimmed.length < MIN_QUERY_LENGTH) {
    status = "Type at least 2 letters to search menu items and dining locations.";
  } else if (error) {
    status = null;
  } else if (searching && results.length === 0) {
    status = "Searching…";
  } else if (!searching && results.length === 0) {
    status = `No items match “${trimmed}”. Try fewer or different words.`;
  }

  return (
    <>
      <div className="dm-search" style={{ maxWidth: "none" }}>
        <IconSearch size={16} className="dm-input-search-icon" />
        <label className="dm-sr-only" htmlFor="dm-item-search">
          Search menu items
        </label>
        <input
          id="dm-item-search"
          className="dm-input dm-input-lg dm-input-search"
          type="search"
          placeholder="Search menu items, e.g. pesto pasta"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoFocus
        />
      </div>

      {error && (
        <p className="dm-alert dm-alert-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <p className="dm-hint dm-search-status" aria-live="polite">
        {status}
      </p>

      {results.length > 0 && (
        <ul className="dm-results" aria-label="Search results">
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" className="dm-result" onClick={() => onSelect(item)}>
                <span className="dm-result-name">{item.name}</span>
                <span className="dm-result-meta">
                  {item.restaurant} · {formatNumber(item.kcal)} kcal ·{" "}
                  {formatNumber(item.protein_g)} g protein
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DetailsStep({ item, onBack, onClose, onLogged }) {
  const [quantity, setQuantity] = useState("1");
  const [mealType, setMealType] = useState(defaultMealType);
  const [date, setDate] = useState(localDateString);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qty = Number(quantity);
  const qtyValid = quantity.trim() !== "" && Number.isFinite(qty) && qty > 0 && qty <= 20;

  async function handleSave(event) {
    event.preventDefault();
    if (!qtyValid) return;

    setSaving(true);
    setError("");
    try {
      await createMealLog({
        item_id: Number(item.id),
        quantity: qty,
        meal_type: mealType,
        meal_date: date,
      });
      onLogged(item);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      <div className="dm-selected">
        <div>
          <p className="dm-result-name">{item.name}</p>
          <p className="dm-result-meta">
            {item.restaurant} · {formatNumber(item.kcal)} kcal per serving
          </p>
        </div>
        <button type="button" className="dm-btn dm-btn-secondary dm-btn-sm" onClick={onBack}>
          Change
        </button>
      </div>

      <div className="dm-fields-3">
        <div className="dm-field">
          <label className="dm-label" htmlFor="dm-log-qty">
            Servings
          </label>
          <input
            id="dm-log-qty"
            className="dm-input"
            type="number"
            inputMode="decimal"
            min="0.25"
            max="20"
            step="0.25"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={!qtyValid}
            required
            autoFocus
          />
        </div>
        <div className="dm-field">
          <label className="dm-label" htmlFor="dm-log-type">
            Meal
          </label>
          <select
            id="dm-log-type"
            className="dm-select"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {capitalize(type)}
              </option>
            ))}
          </select>
        </div>
        <div className="dm-field">
          <label className="dm-label" htmlFor="dm-log-date">
            Date
          </label>
          <input
            id="dm-log-date"
            className="dm-input"
            type="date"
            max={localDateString()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <p className="dm-preview" aria-live="polite">
        {qtyValid ? (
          <>
            <strong>{formatNumber(item.kcal * qty)} kcal</strong> ·{" "}
            {formatNumber(item.protein_g * qty)} g protein ·{" "}
            {formatNumber(item.carbs_g * qty)} g carbs · {formatNumber(item.total_fat_g * qty)} g
            fat
          </>
        ) : (
          <span className="dm-hint">Enter between 0.25 and 20 servings.</span>
        )}
      </p>

      {error && (
        <p className="dm-alert dm-alert-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="dm-modal-actions">
        <button type="button" className="dm-btn dm-btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="dm-btn dm-btn-primary" disabled={!qtyValid || saving}>
          {saving ? "Logging…" : "Log meal"}
        </button>
      </div>
    </form>
  );
}

export default function LogMealDialog({ onClose, onLogged }) {
  const [query, setQuery] = useState(""); // kept when going back from details
  const [item, setItem] = useState(null);

  // Escape closes the dialog; lock page scroll while it's open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="dm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dm-modal" role="dialog" aria-modal="true" aria-labelledby="dm-log-title">
        <div className="dm-modal-head">
          <div>
            <p className="dm-eyebrow">Log a meal</p>
            <h2 id="dm-log-title" className="dm-card-title">
              {item ? "Add the details" : "What did you eat?"}
            </h2>
          </div>
          <button type="button" className="dm-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {item ? (
          <DetailsStep
            item={item}
            onBack={() => setItem(null)}
            onClose={onClose}
            onLogged={onLogged}
          />
        ) : (
          <SearchStep query={query} setQuery={setQuery} onSelect={setItem} />
        )}
      </div>
    </div>
  );
}
