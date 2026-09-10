const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
const { seedStarterSets } = require('../seed-sets')

const ALLOWED_MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'abs', 'quads', 'hamstrings', 'glutes', 'calves',
]

// POST /api/workouts/:workoutId/exercises
// adds a new exercise to a specific workout
// notice the route is just '/:workoutId/exercises' here because in index.js
// this router will be mounted at '/api/workouts' — so the full path combines
router.post('/:workoutId/exercises', requireAuth, async(req, res) => {

  // workoutId - workout added to, name - exercise name,
  // catalogId - optional link back to exercise_catalog when the name came from a search result.

  const { workoutId } = req.params
  const { name } = req.body
  // explicit default — don't depend on how pg handles a bare `undefined` bind param
  const catalogId = req.body.catalogId ?? null
  // force null whenever catalogId is set (muscle data already comes from the
  // catalog then) and fall back to null for anything not in the allow-list —
  // an invalid/missing value is just "no muscle group", not a rejected request
  const muscleGroup = (!catalogId && ALLOWED_MUSCLE_GROUPS.includes(req.body.muscleGroup))
    ? req.body.muscleGroup
    : null

  if (!name) return res.status(400).json({ error: 'All fields required' })

  // verify the workout exists AND belongs to this user before adding to it
  // this is the authorization check — you can't add exercises to someone else's workout
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [workoutId])
  const workout = workoutResult.rows[0]

  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  try {
    // insert the exercise
    // foreign key in action: exercises.workout_id = workouts.id
    const result = await pool.query(
      'INSERT INTO exercises (workout_id, name, catalog_id, muscle_group) VALUES ($1, $2, $3, $4) RETURNING id, name, catalog_id, muscle_group',
      [workoutId, name, catalogId, muscleGroup]
    )

    // fetch and return the newly created exercise
    const newExercise = result.rows[0]

    // CLAUDE CODE — "2 imprinted sets" redesign: a new exercise now arrives
    // pre-built with 2 unconfirmed starter sets instead of the user opening
    // a separate add-set popup form. Skipped for a template — templates
    // hold exercises only, sets always belong to a specific dated session
    // (see workouts.js's is_template comments / the /:id/log-today route).
    if (!workout.is_template) {
      await seedStarterSets(req.userId, newExercise.id, newExercise.name)
    }

    // return
    res.status(201).json(newExercise)
  } catch {
    res.status(500).json({ error: 'Failed to create exercise' })
  }
})

// DELETE /api/exercises/:id
router.delete('/exercises/:id', requireAuth, async (req, res) => {
  const { id } = req.params

  // verify if the exercise exists
  const exerciseResult = await pool.query('SELECT * FROM exercises WHERE id = $1', [id])
  const exercise = exerciseResult.rows[0]
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })
  
  // exercises don't directly have user_id — we have to climb up to workouts
  // this is the chain in practice: exercises → workouts → user_id
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [exercise.workout_id])
  const workout = workoutResult.rows[0]
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // delete PRs for all sets belonging to this exercise, BEFORE deleting the sets
  await pool.query(`
    DELETE FROM prs
    WHERE set_id IN (
      SELECT id FROM sets WHERE exercise_id = $1
    )
  `, [id])

  // delete child sets first — foreign key constraint prevents deleting
  // an exercise while sets still reference it via exercise_id
  await pool.query('DELETE FROM sets WHERE exercise_id = $1', [id])

  // now safe to delete the exercise itself
  await pool.query('DELETE FROM exercises WHERE id = $1', [id])
  res.json({ message: 'Exercise deleted' })
})

module.exports = router