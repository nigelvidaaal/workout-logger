// Turns raw per-muscle tonnage into "most trained" / "needs work" callouts for
// the Dashboard's Muscle Balance boxes.
//
// volumeByGroup is exactly what getMuscleVolume() returns: { group: tonnage },
// but only for groups with at least one logged, catalog-linked set this period
// — untouched groups are simply missing keys, not present with a value of 0.
import { MUSCLE_GROUPS } from '../constants/muscleGroups';

export function buildMuscleBalance(volumeByGroup) {
  // fill in all 10 groups, defaulting any missing from volumeByGroup to 0
  const allGroups = MUSCLE_GROUPS.map((group) => ({
    value: group.value,
    label: group.label,
    tonnage: volumeByGroup[group.value] ?? 0,
  }));

  // sort a COPY, highest tonnage first — sort() mutates in place, so spreading
  // into a new array first keeps allGroups itself untouched
  const sorted = [...allGroups].sort((a, b) => b.tonnage - a.tonnage);

  // top 3, but only groups with real tonnage — an empty slot shouldn't read as "most trained"
  const mostTrained = sorted.filter((m) => m.tonnage > 0).slice(0, 3);

  // bottom 3 of the FULL list — untrained (0-tonnage) groups belong here on purpose
  const needsWork = sorted.slice(-3);

  return { mostTrained, needsWork };
}