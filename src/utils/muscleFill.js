// 3-tier vivid heat-map scheme: each muscle group's intensity (0..1, relative to
// whichever group has the most volume) is bucketed into one of 3 fixed colors
// rather than one hue scaled by opacity — reads as distinct "focus levels" at a glance.
const TIER_HIGH = { min: 0.66, color: "#33FF33", label: "High" };   // neon green
const TIER_MID = { min: 0.33, color: "#00D2FF", label: "Medium" };  // vivid cyan
const TIER_LOW = { min: 0, color: "#FFD700", label: "Low" };        // bright yellow

function getTier(intensity) {
  if (intensity >= TIER_HIGH.min) return TIER_HIGH;
  if (intensity >= TIER_MID.min) return TIER_MID;
  return TIER_LOW;
}

// fill is computed here (not a CSS class) because the tier depends on a continuous
// value driven by data. shared by MuscleBodyChart (the SVG regions) and MuscleChart
// (the legend swatches) so both always agree on what a given intensity looks like.
export function getFill(group, intensityByGroup) {
  const intensity = intensityByGroup?.[group] ?? 0;
  if (!intensity) return "var(--border)";
  return getTier(intensity).color;
}

// text label for the same tier — color alone is hard to read precisely and
// unreadable for some colorblind users, so the legend pairs it with this
export function getTierLabel(group, intensityByGroup) {
  const intensity = intensityByGroup?.[group] ?? 0;
  if (!intensity) return null;
  return getTier(intensity).label;
}
