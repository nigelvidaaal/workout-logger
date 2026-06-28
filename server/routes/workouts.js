const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

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
router.get('/', requireAuth, (req, res) => {
  const workouts = db.prepare(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC'
  ).all(req.userId)
  // req.userId comes from requireAuth middleware — it's the logged-in user's id
  res.json(workouts)
})


// POST / 
router.post('/', requireAuth, (req, res) => {
  // destructure name from req.body 
  const { name } = req.body;

  // validate if name exists
  if (!name) {
    return res.status(401).json({ error: 'Name not found!' });
  }

  // insert the workout — user_id comes from req.userId set by requireAuth
  // this is how every workout gets tied to its owner
  try {
    const result = db.prepare(
      'INSERT INTO workouts (user_id, name) VALUES (?, ?)'
    ).run(req.userId, name)
    //     ↑ user       ↑ workout name

    // after inserting, fetch the new workout and return it
    const newWorkout = db.prepare(
      'SELECT * FROM workouts WHERE id = ?'
    ).get(result.lastInsertRowid)

    // return, 201 = Created
    res.status(201).json(newWorkout)

  } catch {
    return res.status(500).json({ error: 'Failed to create workout'});
  }
})

// GET/:id - one workout with all its exercises and sets 
router.get('/:id', requireAuth, (req, res) => {
  // req.body is for POST/PATCH 
  const { id } = req.params;

  // verify if workout exists
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id) 
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  
  // then verify if it belongs to the logged in user 
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // JOIN query — pulls exercises and their sets in one database call
  // LEFT JOIN ensures exercises with no sets yet are still included
  // aliases (AS exercise_id etc) prevent column name collisions between tables
  const rows = db.prepare(`
    SELECT
      exercises.id AS exercise_id,
      exercises.name AS exercise_name,
      sets.id AS set_id,
      sets.reps,
      sets.weight,
      sets.set_number
    FROM exercises
    LEFT JOIN sets ON sets.exercise_id = exercises.id
    WHERE exercises.workout_id = ?
    ORDER BY exercises.id, sets.set_number
  `).all(id)

  // transform flat rows into nested exercise objects with sets arrays
  const exercises = groupExercisesWithSets(rows)

  // spread workout's own properties and add exercises array
  // result shape: { id, name, date, user_id, exercises: [{ id, name, sets: [] }] }
  res.json({ ...workout, exercises })
})

router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params
  // verify if the workout exists 
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id)
  if (!workout) return res.status(404).json({ error: 'Workout not found' })
  if (workout.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' })

  // delete and return a message that says that
  db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  res.json({ message: 'Workout deleted' })
})

module.exports = router