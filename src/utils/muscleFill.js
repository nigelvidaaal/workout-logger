// fill is computed here (not a CSS class) because alpha is a continuous
// value driven by data — a static class can't express "0.37 trained" vs "0.82 trained".
// shared by MuscleBodyChart (the SVG regions) and MuscleChart (the legend swatches)
// so both always agree on what a given intensity looks like.
export function getFill(group, intensityByGroup) {
  const intensity = intensityByGroup?.[group] ?? 0;
  if (!intensity) return "var(--border)";
  const alpha = 0.15 + intensity * 0.85;
  return `rgba(233, 69, 96, ${alpha})`;
}
