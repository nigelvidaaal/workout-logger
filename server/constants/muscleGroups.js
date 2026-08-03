// the fixed set of muscle-group tags exercises can be assigned.
// single source of truth for backend validation — the frontend keeps its own
// copy (src/constants/muscleGroups.js) since this list is frozen, not tunable data.
const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
]

module.exports = { MUSCLE_GROUPS }
