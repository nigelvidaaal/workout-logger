const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

// POST (add)
// full URL: POST /api/sets
// adds a new set to a specific exercise
router.post('/', requireAuth, (req, res) => {
  // all four values are required to create a set
  const { exerciseId, reps, weight, set_number } = req.body

  // validate all fields exist before touching the database
  if (!exerciseId || !reps || !weight || !set_number) {
    return res.status(400).json({ error: 'exerciseId, reps, weight and set_number are all required' })
  }

  // VERIFICATION CHECK sets have no user_id, so climb: sets → exercises → workouts → user_id

  // hop 1: find the exercise this set belongs to
  // exercise_id is the foreign key on sets pointing up to exercises
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })

  // hop 2: find the workout that exercise belongs to
  // workout_id is the foreign key on exercises pointing up to workouts
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(exercise.workout_id)

  // workout.user_id is where ownership finally lives — compare to logged-in user
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  try {
    // insert the set — exercise_id links it to its parent exercise
    const result = db.prepare(
      'INSERT INTO sets (exercise_id, reps, weight, set_number) VALUES (?, ?, ?, ?)'
    ).run(exerciseId, reps, weight, set_number)

    // fetch the newly created row so we return the full object including its generated id
    const newSet = db.prepare(
      'SELECT * FROM sets WHERE id = ?'
    ).get(result.lastInsertRowid)

    // 201 = Created
    res.status(201).json(newSet)
  } catch {
    res.status(500).json({ error: 'Failed to create set' })
  }
})

// PATCH (update)
// full URL: PATCH /api/sets/:id
router.patch('/:id', requireAuth, (req, res) => {
  // id — which set to update (from URL)
  const { id } = req.params
  // reps and weight — the new values (from request body)
  const { reps, weight } = req.body

  // find the set — 404 if it doesn't exist
  const set = db.prepare('SELECT * FROM sets WHERE id = ?').get(id)
  if (!set) return res.status(404).json({ error: 'Set not found' })

  // OWNERSHIP CHECK — two hops up the chain
  // hop 1: set.exercise_id points up to exercises
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(set.exercise_id)
  // hop 2: exercise.workout_id points up to workouts
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(exercise.workout_id)
  // workout.user_id is where ownership lives
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // ?? (nullish coalescing) — use the new value if provided, keep existing if not
  // allows the client to update just reps, just weight, or both at once
  db.prepare('UPDATE sets SET reps = ?, weight = ? WHERE id = ?')
    .run(
      reps ?? set.reps,       // new reps if sent, otherwise keep current reps
      weight ?? set.weight,   // new weight if sent, otherwise keep current weight
      id
    )

  // fetch and return the updated set so React has the latest values
  const updatedSet = db.prepare('SELECT * FROM sets WHERE id = ?').get(id)
  res.json(updatedSet)
})

// DELETE /:id
// full URL: DELETE /api/sets/:id
// deletes a specific set by id
router.delete('/:id', requireAuth, (req, res) => {
  // id — which set to delete (from URL)
  const { id } = req.params

  // find the set first so we can climb the chain
  const set = db.prepare('SELECT * FROM sets WHERE id = ?').get(id)
  if (!set) return res.status(404).json({ error: 'Set not found' })

  // OWNERSHIP CHECK — two hops up the chain
  // hop 1: set.exercise_id points up to exercises
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(set.exercise_id)
  // hop 2: exercise.workout_id points up to workouts
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(exercise.workout_id)
  // ownership check
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // .run() for DELETE — no rows returned, just executes
  db.prepare('DELETE FROM sets WHERE id = ?').run(id)
  res.json({ message: 'Set deleted' })
})

module.exports = router