const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
// curly braces; destructuring 
const { checkAchievements } = require('../achievements')

// POST (add)
// full URL: POST /api/sets
router.post('/', requireAuth, async (req, res) => {
  const { exerciseId, reps, weight, set_number } = req.body

  if (!exerciseId || !reps || !weight || !set_number) {
    return res.status(400).json({ error: 'exerciseId, reps, weight and set_number are all required' })
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
    // ── STEP 1: get the historical best BEFORE inserting ──
    const rowResult = await pool.query(`
      SELECT MAX(sets.weight) AS best
      FROM sets
      JOIN exercises ON sets.exercise_id = exercises.id
      JOIN workouts ON exercises.workout_id = workouts.id
      WHERE workouts.user_id = $1
        AND LOWER(exercises.name) = LOWER($2)
    `, [req.userId, exercise.name])

    // if no prior sets exist, best is null — treat that as 0 so any first lift counts
    const previousBest = rowResult.rows[0].best ?? 0

    // insert the set (your existing code) 
    const result = await pool.query(
      'INSERT INTO sets (exercise_id, reps, weight, set_number) VALUES ($1, $2, $3, $4) RETURNING id',
      [exerciseId, reps, weight, set_number]
    )

    const newSetId = result.rows[0].id

    // result object in the response
    const newSetResult = await pool.query('SELECT * FROM sets WHERE id = $1', [newSetId])
    const newSet = newSetResult.rows[0]

    // decide if it's a PR ──
    let isPR = false
    // achievements.js 
    let unlockedAchievements = []
    if (weight > previousBest) {
      isPR = true

      // record the PR event
      await pool.query(`
        INSERT INTO prs (user_id, exercise_name, weight, reps, set_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.userId, exercise.name, weight, reps, newSetId] )
      
      // check achievements now that a PR was recorded
      unlockedAchievements = await checkAchievements(req.userId, exercise.name)
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
router.patch('/:id', requireAuth, async (req, res) => {
  // id — which set to update (from URL)
  const { id } = req.params
  // reps and weight — the new values (from request body)
  const { reps, weight } = req.body

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

  // ** NOTE ** : we could do 1 query using JOIN but we did 2 for systematically thinking typeshi

  // ?? (nullish coalescing) — use the new value if provided, keep existing if not
  // allows the client to update just reps, just weight, or both at once
  await pool.query('UPDATE sets SET reps = $1, weight = $2 WHERE id = $3', 
    [
      reps ?? set.reps,       // new reps if sent, otherwise keep current reps
      weight ?? set.weight,   // new weight if sent, otherwise keep current weight
      id
    ]
  )
    

  // fetch and return the updated set so React has the latest values
  const updatedSetResult = await pool.query('SELECT * FROM sets WHERE id = $1',[id])
  const updatedSet = updatedSetResult.rows[0]

  res.json(updatedSet)
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

