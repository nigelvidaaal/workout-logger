import { Home, Dumbbell, BicepsFlexed, Medal } from "lucide-react";

// single source of truth for the app's 4 main pages — shared by the desktop
// Sidebar and the mobile BottomNav so they can never drift out of sync
// (same routes, same icons, same order) even though they're two separate
// components rendered at two different breakpoints.
export const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/muscles", label: "Muscles", icon: BicepsFlexed },
  { to: "/prs", label: "PRs", icon: Medal },
];
