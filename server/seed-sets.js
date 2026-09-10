// CLAUDE CODE — shared "pre-fill from history" helper for the two different
// places a set now gets created automatically: adding a brand-new exercise
// (2 starter sets get built for it right away) and tapping "+ Add Set" on
// an existing one (1 more set gets appended). Both should repeat the user's
// last CONFIRMED reps/weight for that exercise name — the same "quick-
// repeat" idea already used elsewhere in this app — so that lookup lives
// here once instead of being copy-pasted into exercises.js and sets.js.
const pool = require('./db-pg')

// last confirmed reps/weight for this user+exercise name, case-insensitive —
// same "same exercise = name match" identity rule PR-checking already uses
// (see achievements.js / the PR lookup in routes/sets.js). Returns nulls
// when there's no confirmed history yet, so callers never need a null-check
// before destructuring the result.
async function getLastConfirmedSet(userId, exerciseName) {
  const result = await pool.query(`
    SELECT s.reps, s.weight
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    WHERE w.user_id = $1
      AND LOWER(e.name) = LOWER($2)
      AND s.completed = true
    ORDER BY s.id DESC
    LIMIT 1
  `, [userId, exerciseName])

  const last = result.rows[0]
  return {
    reps: last ? last.reps : null,
    weight: last ? last.weight : null,
  }
}

// builds the 2 "imprinted" starter sets for a freshly-added exercise — both
// unconfirmed (completed: false), pre-filled from history so there's usually
// nothing left to type before tapping the checkmark. Falls back to blank
// (null) reps/weight the first time this exercise name is ever added.
async function seedStarterSets(userId, exerciseId, exerciseName) {
  const { reps, weight } = await getLastConfirmedSet(userId, exerciseName)
  await pool.query(
    `INSERT INTO sets (exercise_id, reps, weight, set_number, completed)
     VALUES ($1, $2, $3, 1, false), ($1, $4, $5, 2, false)`,
    [exerciseId, reps, weight, reps, weight]
  )
}

module.exports = { getLastConfirmedSet, seedStarterSets }
