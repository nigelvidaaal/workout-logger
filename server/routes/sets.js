const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
// curly braces; destructuring
const { checkAchievements } = require('../achievements')
const { getLastConfirmedSet } = require('../seed-sets')

// POST (add)
// full URL: POST /api/sets
// CLAUDE CODE — "2 imprinted sets" redesign: this used to take
// {exerciseId, reps, weight, set_number} straight from a popup add-set
// form. That form is gone — "+ Add Set" now just appends ONE more
// unconfirmed row (completed: false), the server works out its set_number
// and pre-fills reps/weight from history itself, same as the 2 starter sets
// a brand-new exercise gets (see seed-sets.js). No PR-check here anymore —
// an unconfirmed set hasn't been "logged" yet, so PR/achievement detection
// moved to PATCH, at the moment the user actually taps the checkmark.
router.post('/', requireAuth, async (req, res) => {
  const { exerciseId } = req.body

  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId is required' })
  }

  // ownership climb (unchanged)
  const exerciseResult = await pool.query('SELECT * FROM exercises WHERE id = $1', [exerciseId])
  const exercise = exerciseResult.rows[0]

  // if none found, output error
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })

  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [exercise.workout_id])
  const workout = workoutResult.rows[0]

  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  try {
    // next set_number is just "current max + 1" for this exercise — the
    // client used to send this itself, but the server always knows it
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX(set_number), 0) AS max_num FROM sets WHERE exercise_id = $1',
      [exerciseId]
    )
    const nextSetNumber = maxResult.rows[0].max_num + 1

    // pre-fill from the last CONFIRMED set for this exercise name — same
    // history lookup seedStarterSets uses when an exercise is first added
    const { reps, weight } = await getLastConfirmedSet(req.userId, exercise.name)

    const result = await pool.query(
      `INSERT INTO sets (exercise_id, reps, weight, set_number, completed)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [exerciseId, reps, weight, nextSetNumber]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create set' })
  }
})

// PATCH (update)
// full URL: PATCH /api/sets/:id
// CLAUDE CODE — extended for the "2 imprinted sets" redesign: still updates
// reps/weight (e.g. editing an already-logged set), but now also accepts
// `completed` — this is the checkmark toggle. PR/achievement detection
// used to run at set-creation time (old POST /); it now runs here, and only
// on the false → true transition, since that's the moment a set actually
// becomes "logged". Toggling back to false (un-confirming, e.g. a misclick)
// removes any PR record that pointed at this set, the same cleanup DELETE
// /:id below already does before removing a set outright — already-unlocked
// achievements are never revoked either way, matching that same precedent.
router.patch('/:id', requireAuth, async (req, res) => {
  // id — which set to update (from URL)
  const { id } = req.params
  // reps, weight, completed — whichever of these the client sent
  const { reps, weight, completed } = req.body

  // find the set — 404 if it doesn't exist
  const setResult = await pool.query('SELECT * FROM sets WHERE id = $1', [id])
  const set = setResult.rows[0]
  if (!set) return res.status(404).json({ error: 'Set not found' })

  // OWNERSHIP CHECK — two hops up the chain
  // hop 1: set.exercise_id points up to exercises
  const exerciseResult = await pool.query('SELECT * FROM exercises WHERE id = $1', [set.exercise_id])
  const exercise = exerciseResult.rows[0]

  // hop 2: exercise.workout_id points up to workouts
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [exercise.workout_id])
  const workout = workoutResult.rows[0]

  // workout.user_id is where ownership lives
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // ?? (nullish coalescing) — use the new value if provided, keep existing if not.
  // Deliberately NOT `||` — reps/weight of 0 are real values (e.g. a
  // bodyweight exercise with no added weight) and must not fall through to
  // the existing value the way a falsy-check would.
  const newReps = reps ?? set.reps
  const newWeight = weight ?? set.weight
  const newCompleted = completed ?? set.completed

  // can't confirm a set that's still blank — nothing to log yet
  if (newCompleted && (newReps === null || newWeight === null)) {
    return res.status(400).json({ error: 'reps and weight are required to confirm a set' })
  }

  try {
    let isPR = false
    let unlockedAchievements = []

    // ── just confirmed (false → true): this is the new "did this count as
    // a PR" moment, moved here from set-creation time ──
    if (newCompleted && !set.completed) {
      // historical best BEFORE this set is marked completed — same shape as
      // the old POST /'s PR check, just scoped to confirmed sets only
      const rowResult = await pool.query(`
        SELECT MAX(sets.weight) AS best
        FROM sets
        JOIN exercises ON sets.exercise_id = exercises.id
        JOIN workouts ON exercises.workout_id = workouts.id
        WHERE workouts.user_id = $1
          AND LOWER(exercises.name) = LOWER($2)
          AND sets.completed = true
      `, [req.userId, exercise.name])

      const previousBest = rowResult.rows[0].best ?? 0
      if (newWeight > previousBest) isPR = true
    }

    // the actual update
    await pool.query('UPDATE sets SET reps = $1, weight = $2, completed = $3 WHERE id = $4',
      [newReps, newWeight, newCompleted, id]
    )

    if (isPR) {
      // record the PR event
      await pool.query(`
        INSERT INTO prs (user_id, exercise_name, weight, reps, set_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.userId, exercise.name, newWeight, newReps, id])

      // check achievements now that a PR was recorded
      unlockedAchievements = await checkAchievements(req.userId, exercise.name)
    } else if (!newCompleted && set.completed) {
      // ── un-confirmed (true → false): any PR this set earned is stale now
      await pool.query('DELETE FROM prs WHERE set_id = $1', [id])
    }

    // fetch and return the updated set so React has the latest values
    const updatedSetResult = await pool.query('SELECT * FROM sets WHERE id = $1', [id])
    const updatedSet = updatedSetResult.rows[0]

    res.json({ ...updatedSet, isPR, unlockedAchievements })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update set' })
  }
})

// DELETE /:id
// full URL: DELETE /api/sets/:id
// deletes a specific set by id
router.delete('/:id', requireAuth, async (req, res) => {
  // id — which set to delete (from URL)
  const { id } = req.params

  // find the set first so we can climb the chain
  const setResult = await pool.query('SELECT * FROM sets WHERE id = $1', [id])
  const set = setResult.rows[0]

  if (!set) return res.status(404).json({ error: 'Set not found' })

  // OWNERSHIP CHECK — two hops up the chain
  // hop 1: set.exercise_id points up to exercises
  const exerciseResult = await pool.query('SELECT * FROM exercises WHERE id = $1', [set.exercise_id])
  const exercise = exerciseResult.rows[0]

  // hop 2: exercise.workout_id points up to workouts
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [exercise.workout_id])
  const workout = workoutResult.rows[0]

  // ownership check
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  //delete any PR pointing at this set first (foreign key constraint)
  await pool.query('DELETE FROM prs WHERE set_id = $1', [id])

  // for DELETE — no rows returned, just executes
  await pool.query('DELETE FROM sets WHERE id = $1', [id])
  res.json({ message: 'Set deleted' })
})

module.exports = router
