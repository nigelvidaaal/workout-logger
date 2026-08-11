const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
const { APP_TIMEZONE } = require('../constants/timezone')

const ALLOWED_RANGES = ['week', 'month', 'all']

// shared by every route in this file — week/month apply a lower bound on w.date
// (converted to APP_TIMEZONE local time via the double AT TIME ZONE pattern; see
// server/routes/workouts.js for why the double conversion is required), all applies
// no bound. Hoisted here instead of duplicated per-route to avoid drift.
const LOWER_BOUND_CLAUSES = {
  week: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '7 days'`,
  month: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '30 days'`,
  all: '',
}

// GET /api/analytics/volume?range=week|month|all
// total training volume (reps x weight), bucketed over time — feeds the
// Dashboard analytics chart. Raw sets only, no exercise_catalog join needed.
router.get('/volume', requireAuth, async (req, res) => {
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'week'

  // week buckets by day (7 points); month/all bucket by week (coarser over a longer span).
  const bucketExpr = range === 'week'
    ? `DATE(w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}')`
    : `DATE_TRUNC('week', w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}')::date`

  const result = await pool.query(`
    SELECT
      ${bucketExpr} AS bucket,
      SUM(s.weight * s.reps) AS volume
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    WHERE w.user_id = $1
      ${LOWER_BOUND_CLAUSES[range]}
    GROUP BY bucket
    ORDER BY bucket
  `, [req.userId])

  res.json(result.rows)
})

// GET /api/analytics/exercises?range=week|month|all
// top 6 exercises by total volume within the range — feeds the Exercise
// Comparison bar chart. Same range whitelist/timezone handling as /volume.
router.get('/exercises', requireAuth, async (req, res) => {
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'week'

  const result = await pool.query(`
    SELECT
      LOWER(e.name) AS name,
      MAX(s.weight) AS top_weight,
      SUM(s.weight * s.reps) AS total_volume
    FROM sets s
    JOIN exercises e ON s.exercise_id = e.id
    JOIN workouts w ON e.workout_id = w.id
    WHERE w.user_id = $1
      ${LOWER_BOUND_CLAUSES[range]}
    GROUP BY LOWER(e.name)
    ORDER BY total_volume DESC
    LIMIT 6
  `, [req.userId])

  res.json(result.rows)
})

module.exports = router
