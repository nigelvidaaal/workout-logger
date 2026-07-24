const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

// POST /api/workouts/:workoutId/exercises
// adds a new exercise to a specific workout
// notice the route is just '/:workoutId/exercises' here because in index.js
// this router will be mounted at '/api/workouts' — so the full path combines
router.post('/:workoutId/exercises', requireAuth, (req, res) => {

  // workoutId - workout added to, name - exercise name 
  const { workoutId } = req.params
  const { name } = req.body

  if (!name) return res.status(400).json({ error: 'All fields required' })

  // verify the workout exists AND belongs to this user before adding to it
  // this is the authorization check — you can't add exercises to someone else's workout
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  try {
    // insert the exercise
    // foreign key in action: exercises.workout_id = workouts.id
    const result = db.prepare(
      'INSERT INTO exercises (workout_id, name) VALUES (?, ?)'
    ).run(workoutId, name)

    // fetch and return the newly created exercise
    const newExercise = db.prepare(
      'SELECT * FROM exercises WHERE id = ?'
    ).get(result.lastInsertRowid)

    // return
    res.status(201).json(newExercise)
  } catch {
    res.status(500).json({ error: 'Failed to create exercise' })
  }
})

// DELETE /api/exercises/:id
router.delete('/exercises/:id', requireAuth, (req, res) => {
  const { id } = req.params

  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id)
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })
  
  // exercises don't directly have user_id — we have to climb up to workouts
  // this is the chain in practice: exercises → workouts → user_id
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(exercise.workout_id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // delete PRs for all sets belonging to this exercise, BEFORE deleting the sets
  db.prepare(`
    DELETE FROM prs
    WHERE set_id IN (
      SELECT id FROM sets WHERE exercise_id = ?
    )
  `).run(id)

  // delete child sets first — foreign key constraint prevents deleting
  // an exercise while sets still reference it via exercise_id
  db.prepare('DELETE FROM sets WHERE exercise_id = ?').run(id)

  // now safe to delete the exercise itself
  db.prepare('DELETE FROM exercises WHERE id = ?').run(id)
  res.json({ message: 'Exercise deleted' })
})

module.exports = router