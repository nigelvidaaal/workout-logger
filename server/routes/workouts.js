const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
const { computeMuscleVolume } = require('../muscle_split')  // adjust path

// helper — transforms flat JOIN rows into nested exercise objects with sets arrays
function groupExercisesWithSets(rows) {

  // reduce() transforms an array into a single accumulated value
  // here we're accumulating an object where each key is an exercise id
  const map = rows.reduce((acc, row) => {

    // if we haven't seen this exercise id before, make one 
    if (!acc[row.exercise_id]) {
      acc[row.exercise_id] = {
        id: row.exercise_id,
        name: row.exercise_name,
        muscle_group: row.muscle_group,
        sets: []
      }
    }


    // if this row has a set (LEFT JOIN means set columns could be null)
    // push the set into this exercise's sets array
    if (row.set_id) {
      acc[row.exercise_id].sets.push({
        id: row.set_id,
        reps: row.reps,
        weight: row.weight,
        set_number: row.set_number
      })
    }
    return acc
  }, {})

  // convert the object of exercises into an array 
  return Object.values(map)
}

// GET all workouts for the logged-in user
// requireAuth runs first — attaches req.userId if token is valid
router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC',
    [req.userId]
  )
  // the whole array 
  res.json(result.rows)
})


// POST / 
router.post('/', requireAuth, async (req, res) => {
  // destructure name from req.body 
  const { name } = req.body;

  // validate if name exists
  if (!name) {
    return res.status(401).json({ error: 'Name not found!' });
  }

  // insert the workout — user_id comes from req.userId set by requireAuth
  // this is how every workout gets tied to its owner
  try {
    const result = await pool.query(
      'INSERT INTO workouts (user_id, name) VALUES ($1, $2) RETURNING id', 
      [req.userId, name]
    )// ↑ user   ↑ workout name

    // after inserting, fetch the new workout and return it (postgres format)
    const newWorkout = result.rows[0]

    // return, 201 = Created
    res.status(201).json(newWorkout)

  } catch (err){
    console.error(err)
    return res.status(500).json({ error: 'Failed to create workout'});
  }
})

// GET /api/workouts/muscle-volume
// total tonnage (reps x weight) per muscle group, across ALL of the user's workouts.
// registered BEFORE /:id — a single-segment path here would otherwise be
// swallowed by the /:id route above and treated as an (invalid) workout id
router.get('/muscle-volume', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT
      ec.primary_muscles,
      ec.secondary_muscles,
      SUM(s.weight * s.reps) AS tonnage
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    JOIN exercise_catalog ec ON e.catalog_id = ec.id
    WHERE w.user_id = $1
    GROUP BY ec.id, ec.primary_muscles, ec.secondary_muscles
  `, [req.userId])
  
  // muscle-split.js, transform raw rows into per muscle group tonnage
  const volume = computeMuscleVolume(result.rows)

  res.json(volume)
})

// GET/:id - one workout with all its exercises and sets
router.get('/:id', requireAuth, async (req, res) => {
  // req.body is for POST/PATCH 
  const { id } = req.params;

  // verify if workout exists
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [id])
  const workout = workoutResult.rows[0]
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  
  // then verify if it belongs to the logged in user 
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // JOIN query — pulls exercises and their sets in one database call
  // LEFT JOIN ensures exercises with no sets yet are still included
  // aliases (AS exercise_id etc) prevent column name collisions between tables
  const rowsResult = await pool.query(`
    SELECT
      exercises.id AS exercise_id,
      exercises.name AS exercise_name,
      exercises.muscle_group,
      sets.id AS set_id,
      sets.reps,
      sets.weight,
      sets.set_number
    FROM exercises
    LEFT JOIN sets ON sets.exercise_id = exercises.id
    WHERE exercises.workout_id = $1
    ORDER BY exercises.id, sets.set_number
  `, [id])
  
  // passing .rows to the helper
  const exercises = groupExercisesWithSets(rowsResult.rows)

  // spread workout's own properties and add exercises array
  // result shape: { id, name, date, user_id, exercises: [{ id, name, sets: [] }] }
  res.json({ ...workout, exercises })
})

router.get

// GET /api/workouts/progress/:exerciseName
// returns max weight per session for a specific exercise name
router.get('/progress/:exerciseName', requireAuth, async(req, res) => {
  // exerciseName comes from the URL — e.g. /progress/Bench%20Press
  const { exerciseName } = req.params

  // this query climbs the chain: sets → exercises → workouts
  const result = await pool.query(`
    SELECT
      workouts.date,
      MAX(sets.weight) AS maxweight
    FROM sets
    JOIN exercises ON sets.exercise_id = exercises.id
    JOIN workouts ON exercises.workout_id = workouts.id
    WHERE exercises.name = $1
    AND workouts.user_id = $2
    GROUP BY workouts.date
    ORDER BY workouts.date ASC
  `, [ exerciseName, req.userId])
     // needs to be in order (exercises first then userid)

  res.json(result.rows)
})

router.delete('/:id', requireAuth, async(req, res) => {
  const { id } = req.params

  // verify if the workout is there
  const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [id])
  const workout = workoutResult.rows[0]

  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // must delete bottom-up: sets first, then exercises, then the workout
  // each layer has a foreign key pointing up — delete children before parents
  await pool.query(`
    DELETE FROM prs
    WHERE set_id IN (
      SELECT sets.id
      FROM sets
      JOIN exercises ON sets.exercise_id = exercises.id
      WHERE exercises.workout_id = $1
    )
  `, [id])

  // then the existing deletes, in order
  await pool.query(`
    DELETE FROM sets
    WHERE exercise_id IN (SELECT id FROM exercises WHERE workout_id = $1)
  `, [id])

  await pool.query('DELETE FROM exercises WHERE workout_id = $1', [id])
  await pool.query('DELETE FROM workouts WHERE id = $1', [id])

  res.json({ message: 'Workout deleted' })
})

module.exports = router