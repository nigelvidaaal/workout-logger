const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const checkAchievements = require('../achievements')

// POST (add)
// full URL: POST /api/sets
router.post('/', requireAuth, (req, res) => {
  const { exerciseId, reps, weight, set_number } = req.body

  if (!exerciseId || !reps || !weight || !set_number) {
    return res.status(400).json({ error: 'exerciseId, reps, weight and set_number are all required' })
  }

  // ownership climb (unchanged)
  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId)
  if (!exercise) return res.status(404).json({ error: 'Exercise not found' })
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(exercise.workout_id)
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  try {
    // ── STEP 1: get the historical best BEFORE inserting ──
    const row = db.prepare(`
      SELECT MAX(sets.weight) AS best
      FROM sets
      JOIN exercises ON sets.exercise_id = exercises.id
      JOIN workouts ON exercises.workout_id = workouts.id
      WHERE workouts.user_id = ?
        AND LOWER(exercises.name) = LOWER(?)
    `).get(req.userId, exercise.name)

    // if no prior sets exist, best is null — treat that as 0 so any first lift counts
    const previousBest = row.best ?? 0;

    // insert the set (your existing code) 
    const result = db.prepare(
      'INSERT INTO sets (exercise_id, reps, weight, set_number) VALUES (?, ?, ?, ?)'
    ).run(exerciseId, reps, weight, set_number)

    const newSet = db.prepare('SELECT * FROM sets WHERE id = ?').get(result.lastInsertRowid)

    // decide if it's a PR ──
    let isPR = false
    // achievements.js 
    let unlockedAchievements = []
    if (weight > previousBest) {
      isPR = true

      // record the PR event
      db.prepare(`
        INSERT INTO prs (user_id, exercise_name, weight, reps, set_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.userId, exercise.name, weight, reps, result.lastInsertRowid)
      
      // check achievements now that a PR was recorded
      unlockedAchievements = checkAchievements(req.userId, exercise.name)
    }

    // return the set, now with a PR flag 
    // builds a new object by first spreading every property of newSet into it
    res.status(201).json({ ...newSet, isPR, unlockedAchievements })
  } catch (err){
    console.error(err)
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

  // ** NOTE ** : we could do 1 query using JOIN but we did 2 for systematically thinking typeshi

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

  //delete any PR pointing at this set first (foreign key constraint)
  db.prepare('DELETE FROM prs WHERE set_id = ?').run(id)

  // .run() for DELETE — no rows returned, just executes
  db.prepare('DELETE FROM sets WHERE id = ?').run(id)
  res.json({ message: 'Set deleted' })
})

module.exports = router

