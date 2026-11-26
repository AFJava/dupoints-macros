// (Written with help from Claude, an LLM.)
// Split layout shared by Login and SignUp: navy brand panel + form panel.

import "../styles/dukemeals.css";
import { Brand } from "./AppLayout.jsx";

export default function AuthLayout({ children }) {
  return (
    <div className="dm dm-auth">
      <section className="dm-auth-brand" aria-label="About DukeMeals">
        <Brand />
        <p className="dm-auth-eyebrow">Eat well. Stay on track.</p>
        <h1 className="dm-auth-headline">
          Good food.
          <br />
          Better balance.
        </h1>
        <p className="dm-auth-lede">
          Your meals, nutrition, and Duke food points.
          <br />
          All in one place.
        </p>

        {/* Decorative preview with sample numbers only. Never load real data here. */}
        <div className="dm-auth-preview" aria-hidden="true">
          <div className="dm-auth-preview-head">
            A little balance, daily.
            <span className="dm-chip dm-chip-green">On track</span>
          </div>
          <div className="dm-auth-preview-stats">
            <div>
              <p className="dm-auth-preview-label">Food points</p>
              <p className="dm-auth-preview-num">780.31</p>
              <p className="dm-auth-preview-cap">Current balance</p>
            </div>
            <div>
              <p className="dm-auth-preview-label">Daily intake</p>
              <p className="dm-auth-preview-num">1,450</p>
              <p className="dm-auth-preview-cap">of 2,000 kcal</p>
            </div>
          </div>
          <div className="dm-auth-preview-bar">
            <span />
          </div>
          <p className="dm-auth-preview-foot">Your daily overview, at a glance.</p>
        </div>

        <div className="dm-auth-pitch">
          <strong>Built around your campus life.</strong>
          <p>Log your favorites. Find your rhythm. Make your points last.</p>
        </div>

        <div className="dm-auth-brand-foot">
          <strong>DukeMeals</strong>
          <span>A little balance, daily.</span>
        </div>
      </section>

      <section className="dm-auth-panel">
        <div className="dm-auth-mobile-brand">
          <Brand />
        </div>
        <div className="dm-auth-form-wrap">{children}</div>
        <p className="dm-auth-panel-foot">Your meals and food points, together.</p>
      </section>
    </div>
  );
}
