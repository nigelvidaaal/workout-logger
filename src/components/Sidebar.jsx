import { NavLink } from "react-router-dom";
import { NAV_LINKS } from "../constants/navLinks";
import styles from "../styles/Sidebar.module.css";

// desktop-only icon sidebar — CSS hides it below the same 640px breakpoint
// the rest of the app treats as the mobile/desktop split. NAV_LINKS is
// shared with BottomNav (mobile's equivalent) so both always point to the
// same 4 pages with the same icons.
export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ""}`
          }
        >
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
