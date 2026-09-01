// Turns raw per-muscle SET COUNTS into the Dashboard's Muscle Balance boxes:
// every one of the 10 groups shown at once (Phase 3 Part 2 — no more
// top-3/bottom-3 split), each with a color that ramps toward the app's
// accent as it approaches the "Target: 10-20 sets/week" hint shown above
// the grid.
//
// CLAUDE CODE — bug fix: this file previously still had the OLD
// tonnage/mostTrained/needsWork implementation, from before the Phase 3
// Part 2 redesign — but Dashboard.jsx (and its CSS/JSX comments) had
// already moved on to expecting THIS shape: a flat array of all 10 groups,
// each `{ value, label, setsPerWeek, color }`. Calling `.map()` on the old
// `{ mostTrained, needsWork }` object crashed the Dashboard. setsByGroup is
// what getMuscleSets() returns: { group: setsPerWeek }, only present for
// groups with at least one logged, catalog-linked set this period —
// untouched groups are simply missing keys, not present with a value of 0.
import { MUSCLE_GROUPS } from '../constants/muscleGroups';

// the low end of the target range — used as the "fully on target" point for
// the color ramp. Going over 20 doesn't fade the color back down; hitting
// the target and blowing past it isn't a problem worth flagging visually.
const TARGET_LOW = 10;

// grey (~var(--text-muted)) at 0 sets, ramping to the app's accent orange
// (~var(--accent)) by the time a group hits TARGET_LOW sets/week
const COLOR_FROM = [112, 112, 112];
const COLOR_TO = [249, 116, 13];

function colorForProgress(setsPerWeek) {
  const progress = Math.min(setsPerWeek / TARGET_LOW, 1);
  const [r, g, b] = COLOR_FROM.map((c, i) =>
    Math.round(c + (COLOR_TO[i] - c) * progress),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

export function buildMuscleBalance(setsByGroup) {
  return MUSCLE_GROUPS.map((group) => {
    const setsPerWeek = setsByGroup[group.value] ?? 0;
    return {
      value: group.value,
      label: group.label,
      setsPerWeek,
      color: colorForProgress(setsPerWeek),
    };
  });
}