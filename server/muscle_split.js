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

module.exports = { computeMuscleVolume };