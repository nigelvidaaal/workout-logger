import { NavLink } from "react-router-dom";
import { NAV_LINKS } from "../constants/navLinks";
import styles from "../styles/BottomNav.module.css";

// NAV_LINKS is [Dashboard, Workouts, Muscles, PRs] — split around the AI
// button so it lands dead center (Home, Workouts, AI, Muscles, PRs),
// matching the 5-icon layout requested. Sidebar (desktop) still renders
// NAV_LINKS as one plain list — only this component slots the AI icon in.
const BEFORE_AI = NAV_LINKS.slice(0, 2);
const AFTER_AI = NAV_LINKS.slice(2);

// aiOpen/onToggleAI come from App.jsx — same shared state the top Navbar's
// AI icon used to own alone. On mobile, THIS is now the only AI trigger
// (Navbar hides its own AI icon at this breakpoint); desktop still uses
// Navbar's, since there's no BottomNav there at all.
export function BottomNav({ aiOpen, onToggleAI }) {
  return (
    <nav className={styles.bottomNav}>
      {BEFORE_AI.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ""}`
          }
        >
          <Icon size={24} strokeWidth={2} />
        </NavLink>
      ))}

      <button
        type="button"
        className={`${styles.aiLink} ${aiOpen ? styles.aiLinkActive : ""}`}
        onClick={onToggleAI}
        aria-label={aiOpen ? "Close AI helper" : "Open AI helper"}
      >
        {/* same chat-head image the old floating button used, on the same
            filled-orange-circle treatment — this button IS that button,
            just relocated into the bar */}
        <img src="/ai_logo_trans.png" alt="" className={styles.aiIcon} />
      </button>

      {AFTER_AI.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ""}`
          }
        >
          <Icon size={24} strokeWidth={2} />
        </NavLink>
      ))}
    </nav>
  );
}
