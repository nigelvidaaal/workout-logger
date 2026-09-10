const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')

const { computeMuscleVolume, computeMuscleSets, mergeGroupAmounts } = require('../muscle_split')  // adjust path
const { APP_TIMEZONE } = require('../constants/timezone')
const { TIERS } = require('../achievements')
const { MUSCLE_MAP } = require('../muscle-map')
const { seedStarterSets } = require('../seed-sets')

// helper — transforms flat JOIN rows into nested exercise objects with sets arrays
function groupExercisesWithSets(rows) {

  // reduce() transforms an array into a single accumulated value
  // here we're accumulating an object where each key is an exercise id
  const map = rows.reduce((acc, row) => {

    // if we haven't seen this exercise id before, make one
    if (!acc[row.exercise_id]) {
      // CLAUDE CODE — unify muscle_group so the frontend always has ONE
      // field to read regardless of where an exercise came from. A catalog
      // exercise's muscle data lives on exercise_catalog (primary_muscles is
      // a raw dataset name like "lats"), so it's routed through MUSCLE_MAP
      // to land on the same 10 chart-bucket names the anatomy chart uses. A
      // custom exercise's muscle_group column is ALREADY one of those final
      // bucket names (see exercises.js's ALLOWED_MUSCLE_GROUPS) — routing it
      // through MUSCLE_MAP a second time would look up a key that doesn't
      // exist (there's no "back": "back" entry) and silently return
      // undefined, so it's used as-is instead. equipment only ever exists
      // for a catalog exercise.
      const muscleGroup = row.catalog_id
        ? (MUSCLE_MAP[row.primary_muscles?.[0]] ?? null)
        : row.custom_muscle_group

      acc[row.exercise_id] = {
        id: row.exercise_id,
        name: row.exercise_name,
        muscle_group: muscleGroup,
        equipment: row.equipment ?? null,
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
        set_number: row.set_number,
        // CLAUDE CODE — "2 imprinted sets": whether this set has actually
        // been logged (tapped the checkmark) or is still an editable draft.
        // See sets.js for the PATCH-time confirm logic and every stats
        // query in this file for why only completed sets count.
        completed: row.completed
      })
    }
    return acc
  }, {})

  // convert the object of exercises into an array
  return Object.values(map)
}

// GET all SAVED WORKOUTS for the logged-in user 
router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM workouts WHERE user_id = $1 AND is_template = true ORDER BY id DESC',
    [req.userId]
  )
  // the whole array
  res.json(result.rows)
})


// POST / — creates a new SAVED WORKOUT (template): no date, is_template = true.
router.post('/', requireAuth, async (req, res) => {
  // destructure name from req.body
  const { name } = req.body;

  // validate if name exists
  if (!name) {
    return res.status(401).json({ error: 'Name not found!' });
  }

  // inserting the new workout 
  try {
    const result = await pool.query(
      'INSERT INTO workouts (user_id, name, date, is_template) VALUES ($1, $2, NULL, true) RETURNING *',
      [req.userId, name]
    )// ↑ user   ↑ workout name

    // after inserting, fetch the new workout and return it 
    const newWorkout = result.rows[0]

    // return, 201 = Created
    res.status(201).json(newWorkout)

  } catch (err){
    console.error(err)
    return res.status(500).json({ error: 'Failed to create workout'});
  }
})

// POST /:id/log-today — clones a saved workout's exercise list into a brand new
router.post('/:id/log-today', requireAuth, async (req, res) => {
  const { id } = req.params

  try {
    // ownership + existence check, same shape as every other :id route here —
    // made explicit (rather than relying on a later step to fail) since this
    // one goes on to perform multiple writes
    const templateResult = await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2 AND is_template = true',
      [id, req.userId]
    )
    const template = templateResult.rows[0]
    if (!template) {
      return res.status(404).json({ error: 'Saved workout not found' })
    }

    const exercisesResult = await pool.query(
      'SELECT name, muscle_group, catalog_id FROM exercises WHERE workout_id = $1',
      [id]
    )

    // this route used to unconditionally INSERT a new dated workout everytime
    const existingTodayResult = await pool.query(`
      SELECT * FROM workouts
      WHERE user_id = $1
        AND is_template = false
        AND name = $2
        AND DATE(date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}') = DATE(NOW() AT TIME ZONE '${APP_TIMEZONE}')
    `, [req.userId, template.name])

    if (existingTodayResult.rows[0]) {
      return res.status(200).json(existingTodayResult.rows[0])
    }

    // today's dated workout — same name as the template it came from
    const newWorkoutResult = await pool.query(
      'INSERT INTO workouts (user_id, name, date, is_template) VALUES ($1, $2, NOW(), false) RETURNING *',
      [req.userId, template.name]
    )
    const newWorkout = newWorkoutResult.rows[0]

    // clone each exercise onto the new workout, one INSERT at a time (not
    // Promise.all). RETURNING id was added so each freshly-cloned exercise
    // can immediately get its own 2 starter sets, same as a manually-added
    // exercise — "log today" shouldn't feel any different from picking the
    // exercises one at a time.
    for (const ex of exercisesResult.rows) {
      const insertResult = await pool.query(
        'INSERT INTO exercises (workout_id, name, muscle_group, catalog_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [newWorkout.id, ex.name, ex.muscle_group, ex.catalog_id]
      )
      await seedStarterSets(req.userId, insertResult.rows[0].id, ex.name)
    }

    res.status(201).json(newWorkout)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to log workout for today' })
  }
})

// GET /api/workouts/muscle-volume
router.get('/muscle-volume', requireAuth, async (req, res) => {
  // frontend sends ?range=today|week|month|all (default, and fallback for
  // anything unrecognized, is 'today' — never silently falls through to all-time)
  const ALLOWED_RANGES = ['today', 'week', 'month', 'all']
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'today'

  const RANGE_CLAUSES = {
    today: `AND DATE(w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}') = DATE(NOW() AT TIME ZONE '${APP_TIMEZONE}')`,
    week: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '7 days'`,
    month: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '30 days'`,
    all: '',
  }
  const dateClause = RANGE_CLAUSES[range]

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
      -- CLAUDE CODE — "2 imprinted sets": unconfirmed draft rows (possibly
      -- null reps/weight) must never count toward tonnage, same reasoning
      -- everywhere else a stats query touches the sets table.
      AND s.completed = true
      ${dateClause}
    GROUP BY ec.id, ec.primary_muscles, ec.secondary_muscles
  `, [req.userId])

  // user's inputted exercise
  const customResult = await pool.query(`
    SELECT
      e.muscle_group,
      SUM(s.weight * s.reps) AS tonnage
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    WHERE w.user_id = $1
      AND e.catalog_id IS NULL
      AND e.muscle_group IS NOT NULL
      AND s.completed = true
      ${dateClause}
    GROUP BY e.muscle_group
  `, [req.userId])

  // muscle-split.js, transform raw rows into per muscle group tonnage
  const volume = computeMuscleVolume(result.rows)
  // merging all together
  mergeGroupAmounts(volume, customResult.rows, 'tonnage')
  res.json(volume)
})

// GET /api/workouts/muscle-sets
router.get('/muscle-sets', requireAuth, async (req, res) => {
  const ALLOWED_RANGES = ['today', 'week', 'month', 'all']
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'week'

  const RANGE_CLAUSES = {
    today: `AND DATE(w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}') = DATE(NOW() AT TIME ZONE '${APP_TIMEZONE}')`,
    week: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '7 days'`,
    month: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '30 days'`,
    all: '',
  }
  const dateClause = RANGE_CLAUSES[range]

  const result = await pool.query(`
    SELECT
      ec.primary_muscles,
      ec.secondary_muscles,
      COUNT(s.id) AS set_count
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    JOIN exercise_catalog ec ON e.catalog_id = ec.id
    WHERE w.user_id = $1
      -- CLAUDE CODE — same "don't count drafts" reasoning as /muscle-volume above
      AND s.completed = true
      ${dateClause}
    GROUP BY ec.id, ec.primary_muscles, ec.secondary_muscles
  `, [req.userId])

  // same custom-exercise gap/fix as /muscle-volume above, just counting
  // sets instead of tonnage. CLAUDE CODE — re-fixed a "set_countz" typo
  // here (extra "z") that had crept back in: mergeGroupAmounts(sets,
  // customResult.rows, 'set_count') below looks up row['set_count'], so the
  // mismatched alias silently made every custom exercise's contribution
  // NaN, corrupting the Muscle Balance stats the same way it did before.
  const customResult = await pool.query(`
    SELECT
      e.muscle_group,
      COUNT(s.id) AS set_count
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    WHERE w.user_id = $1
      AND e.catalog_id IS NULL
      AND e.muscle_group IS NOT NULL
      AND s.completed = true
      ${dateClause}
    GROUP BY e.muscle_group
  `, [req.userId])

  const sets = computeMuscleSets(result.rows)
  mergeGroupAmounts(sets, customResult.rows, 'set_count')
  res.json(sets)
})

// GET /api/workouts/pr-summary
// per-exercise PRs + unlocked achievement badges — feeds the clickable-PRs page.
// registered BEFORE /:id — same single-segment-path hazard as /muscle-volume above
router.get('/pr-summary', requireAuth, async (req, res) => {
  try {
    // all prs for this user, newest first
    const prsResult = await pool.query (
      `SELECT exercise_name, weight, reps, achieved_at
       FROM prs
       WHERE user_id = $1
       ORDER BY achieved_at DESC`,
      [req.userId]
    )

    // all unlocked achievements this year
    // ORDER BY tier ASC matters: PRsPage.jsx picks the LAST entry in each
    // exercise's achievements array as the "top badge" preview icon, assuming
    // it's the highest tier. Without an explicit order, Postgres doesn't
    // guarantee row order at all — this makes that assumption actually true.
    const achResult = await pool.query (
      `SELECT exercise_name, tier
        FROM achievements
        WHERE user_id = $1
        ORDER BY tier ASC`,
        [req.userId]
    )

  // combine into per exercise structure
  const byExercise = {}

    for (const pr of prsResult.rows) {
      const name = pr.exercise_name
      if (!byExercise[name]) {
        byExercise[name] = { exercise_name: name, prs: [], achievements: [] }
      }
      // push/add the item at the end of the array
      byExercise[name].prs.push(pr)
    }

    // add achievements — enrich each tier with name+icon from TIERS
    for (const ach of achResult.rows) {
      const name = ach.exercise_name
      if (!byExercise[name]) {
        byExercise[name] = { exercise_name: name, prs: [], achievements: [] }
      }
        const tierInfo = TIERS.find((t) => t.tier === ach.tier)
        byExercise[name].achievements.push({
          tier: ach.tier,
          name: tierInfo.name,
          icon: tierInfo.icon,
      })
    }
    // object -> array for the frontend
    res.json(Object.values(byExercise))
  } catch (err) {
    console.error(err)
    res.status(500).json({error: 'Failed to fetch PR summary'})
  }

})

// GET /api/workouts/history?weekOffset=N
// and /pr-summary above
router.get('/history', requireAuth, async (req, res) => {
  const rawOffset = Number(req.query.weekOffset)
  const weekOffset =
    Number.isInteger(rawOffset) && rawOffset <= 0 && rawOffset >= -520
      ? rawOffset
      : 0

  try {
    const result = await pool.query(`
      WITH week_start AS (
        -- DATE_TRUNC('week', ...) starts on Monday in Postgres by default,
        -- matching HistoryCalendar's Mon-Sun boxes
        SELECT (
          DATE_TRUNC('week', (NOW() AT TIME ZONE '${APP_TIMEZONE}'))::date
          + ($2 * INTERVAL '7 days')
        )::date AS start_date
      ),
      day_series AS (
        SELECT (week_start.start_date + offset_day * INTERVAL '1 day')::date AS day
        FROM week_start, generate_series(0, 6) AS offset_day
      )
      SELECT
        day_series.day,
        COUNT(DISTINCT e.id) AS exercise_count,
        COUNT(s.id) AS set_count,
        -- one dated workout per day is the expected case (see the log-today
        -- dedup fix above) — MIN() just picks a stable one if that's ever violated
        MIN(w.id) AS workout_id
      FROM day_series
      LEFT JOIN workouts w
        ON w.user_id = $1
        AND w.is_template = false
        AND DATE(w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}') = day_series.day
      LEFT JOIN exercises e ON e.workout_id = w.id
      -- CLAUDE CODE — only confirmed sets count toward a day's "did I train"
      -- history, same reasoning as every other stats query in this file
      LEFT JOIN sets s ON s.exercise_id = e.id AND s.completed = true
      GROUP BY day_series.day
      ORDER BY day_series.day
    `, [req.userId, weekOffset])

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch workout history' })
  }
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
  // CLAUDE CODE — re-added the exercise_catalog join (was missing from this
  // query even though groupExercisesWithSets/the frontend both already
  // expect a unified muscle_group + equipment — restored here rather than
  // built fresh) and added sets.completed for the "2 imprinted sets" feature.
  const rowsResult = await pool.query(`
    SELECT
      exercises.id AS exercise_id,
      exercises.name AS exercise_name,
      exercises.catalog_id,
      exercises.muscle_group AS custom_muscle_group,
      ec.primary_muscles,
      ec.equipment,
      sets.id AS set_id,
      sets.reps,
      sets.weight,
      sets.set_number,
      sets.completed
    FROM exercises
    LEFT JOIN exercise_catalog ec ON exercises.catalog_id = ec.id
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
    -- CLAUDE CODE — draft/unconfirmed sets shouldn't show up as a "max
    -- weight this session" data point on the progress chart
    AND sets.completed = true
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

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { name } = req.body
  if (!name) return res.status(400).json({error: 'Name required'})

  try { 
    // ownership check — verify this workout belongs to the user
    const workoutResult = await pool.query('SELECT * FROM workouts WHERE id = $1', [id])
    const workout = workoutResult.rows[0]

    if (!workout) return res.status(404).json({error: 'Workout not found'})
    if (workout.user_id !== req.userId) return res.status(403).json({error: 'Forbidden'})
    
    // update the name, return the updated row
    const result = await pool.query(
      'UPDATE workouts SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({error: 'Failed to rename workout'})
  }

})

module.exports = router