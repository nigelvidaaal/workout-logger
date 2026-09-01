const { MUSCLE_MAP } = require("./muscle-map")

const SECONDARY_WEIGHT = 0.5;  // secondary muscles get half credit

function computeMuscleVolume(rows) {
  const volume = {};  // { chartGroup: totalTonnage }

  // helper: add tonnage to a chart group, converting via MUSCLE_MAP
  function addToGroup(datasetMuscle, amount) {
    const group = MUSCLE_MAP[datasetMuscle];
    if (!group) return;  // null-mapped (e.g. "neck") — skip
    volume[group] = (volume[group] || 0) + amount;
  }

  for (const row of rows) {
    const tonnage = Number(row.tonnage);

    // primary muscles get FULL tonnage
    for (const muscle of row.primary_muscles) {
      addToGroup(muscle, tonnage);
    }

    // secondary muscles get PARTIAL tonnage
    for (const muscle of row.secondary_muscles) {
      addToGroup(muscle, tonnage * SECONDARY_WEIGHT);
    }
  }

  return volume;
}

// CLAUDE CODE — bug fix: Dashboard.jsx's Muscle Balance boxes ("Target:
// 10-20 sets/week per muscle group") need SET COUNTS per group, not
// tonnage — but there was no function or route computing that at all
// (Dashboard called a getMuscleSets() that didn't even exist in
// src/api/workouts.js — see that file's fix for the full story). This
// mirrors computeMuscleVolume's exact primary/secondary weighting so a
// set "counts" the same way toward a muscle group regardless of which
// stat you're looking at, just summing set_count instead of tonnage.
function computeMuscleSets(rows) {
  const sets = {};  // { chartGroup: totalSets }

  function addToGroup(datasetMuscle, amount) {
    const group = MUSCLE_MAP[datasetMuscle];
    if (!group) return;
    sets[group] = (sets[group] || 0) + amount;
  }

  for (const row of rows) {
    const setCount = Number(row.set_count);

    for (const muscle of row.primary_muscles) {
      addToGroup(muscle, setCount);
    }

    for (const muscle of row.secondary_muscles) {
      addToGroup(muscle, setCount * SECONDARY_WEIGHT);
    }
  }

  // round each group to a whole number — half-credit secondary muscles can
  // leave fractional totals (e.g. 12.5), but "sets" reads as a count, not a
  // measurement, so display-side always wants a whole number
  for (const group of Object.keys(sets)) {
    sets[group] = Math.round(sets[group]);
  }

  return sets;
}

module.exports = { computeMuscleVolume, computeMuscleSets };