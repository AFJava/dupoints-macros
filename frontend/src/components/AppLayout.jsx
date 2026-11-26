// (Written with help from Claude, an LLM.)
// The logged-in app shell: sidebar navigation + top bar.

import "../styles/dukemeals.css";
import {
  IconGrid,
  IconHistory,
  IconLogout,
  IconPlus,
  IconUser,
  IconUtensils,
} from "./Icons.jsx";

const NAV_ITEMS = [
  { page: "home", label: "Overview", Icon: IconGrid },
  { page: "history", label: "Meal history", Icon: IconHistory },
  { page: "profile", label: "Profile", Icon: IconUser },
];

// "Fall 2026 semester" from today's date.
function semesterLabel(date = new Date()) {
  const month = date.getMonth(); // 0 = January
  const year = date.getFullYear();
  if (month >= 7) return `Fall ${year} semester`;
  if (month <= 4) return `Spring ${year} semester`;
  return `Summer ${year} session`;
}

export function Brand() {
  return (
    <div className="dm-brand">
      <span className="dm-brand-mark">
        <IconUtensils size={20} />
      </span>
      <span className="dm-brand-name">DukeMeals</span>
    </div>
  );
}

// Eyebrow + title + subtitle, with an optional "Log a meal" button on the right.
export function PageHeader({ eyebrow, title, subtitle, onLogMeal }) {
  return (
    <header className="dm-page-header">
      <div>
        <p className="dm-eyebrow">{eyebrow}</p>
        <h1 className="dm-title">{title}</h1>
        <p className="dm-subtitle">{subtitle}</p>
      </div>
      {onLogMeal && (
        <button type="button" className="dm-btn dm-btn-primary" onClick={onLogMeal}>
          <IconPlus size={16} />
          Log a meal
        </button>
      )}
    </header>
  );
}

export default function AppLayout({ currentPage, onNavigate, onLogout, children }) {
  const current = NAV_ITEMS.find((item) => item.page === currentPage) ?? NAV_ITEMS[0];

  return (
    <div className="dm dm-shell">
      <aside className="dm-sidebar">
        <Brand />
        <p className="dm-tagline">Eat well. Stay on track.</p>

        <p className="dm-nav-label">Your space</p>
        <nav className="dm-nav" aria-label="Main">
          {NAV_ITEMS.map(({ page, label, Icon }) => (
            <button
              key={page}
              type="button"
              className="dm-nav-item"
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onNavigate(page)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="dm-sidebar-note">
          <strong>A little balance, daily.</strong>
          <p>Your meals and food points, in one place.</p>
        </div>

        <button type="button" className="dm-nav-item dm-logout" onClick={onLogout}>
          <IconLogout />
          Log out
        </button>
      </aside>

      <div className="dm-main">
        <header className="dm-topbar">
          <p className="dm-breadcrumb">My campus / {current.label}</p>
          <span className="dm-semester">{semesterLabel()}</span>
        </header>
        <main className="dm-content">{children}</main>
      </div>
    </div>
  );
}
