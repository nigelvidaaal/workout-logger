import { NavLink } from "react-router-dom";
import { Home, Dumbbell, BicepsFlexed, Medal } from "lucide-react";
import styles from "../styles/Sidebar.module.css";

// desktop-only icon sidebar — CSS hides it below the same 640px breakpoint
// Navbar already uses for its mobile hamburger, so "desktop" means the same
// thing everywhere in the app. Sits alongside the existing top navbar links
// (kept on request) as a second way to get around on wider screens.
const LINKS = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/muscles", label: "Muscles", icon: BicepsFlexed },
  { to: "/prs", label: "PRs", icon: Medal },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {LINKS.map(({ to, label, icon: Icon, end }) => (
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
