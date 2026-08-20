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

// same primary/secondary split as computeMuscleVolume above, just counting
// SETS instead of summing weight*reps — feeds the Dashboard's Muscle
// Balance boxes (Phase 3 Part 2: "10-20 sets/week" targets), which is a
// different question than "how much weight did you move" (computeMuscleVolume,
// still used by the anatomy chart on the Muscles page — untouched by this)
function computeMuscleSets(rows) {
  const sets = {};  // { chartGroup: totalSets }

  function addToGroup(datasetMuscle, amount) {
    const group = MUSCLE_MAP[datasetMuscle];
    if (!group) return;
    sets[group] = (sets[group] || 0) + amount;
  }

  for (const row of rows) {
    const setCount = Number(row.set_count);

    // primary muscles get full credit per set
    for (const muscle of row.primary_muscles) {
      addToGroup(muscle, setCount);
    }

    // secondary muscles get half credit — mirrors SECONDARY_WEIGHT above
    for (const muscle of row.secondary_muscles) {
      addToGroup(muscle, setCount * SECONDARY_WEIGHT);
    }
  }

  return sets;
}

module.exports = { computeMuscleVolume, computeMuscleSets };