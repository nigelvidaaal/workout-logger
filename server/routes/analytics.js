const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
const { APP_TIMEZONE } = require('../constants/timezone')

// GET /api/analytics/volume?range=week|month|all
// total training volume (reps x weight), bucketed over time — feeds the
// Dashboard analytics chart. Raw sets only, no exercise_catalog join needed.
router.get('/volume', requireAuth, async (req, res) => {
  const ALLOWED_RANGES = ['week', 'month', 'all']
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'week'

  // week buckets by day (7 points); month/all bucket by week (coarser over a longer span).
  // see the comment in routes/workouts.js for why the double AT TIME ZONE is required —
  // w.date is naive-but-actually-UTC, so it must be reinterpreted as UTC before
  // converting to APP_TIMEZONE local time
  // ::date cast on the DATE_TRUNC branch so both branches return the same Postgres
  // type (DATE) — keeps pg's date-parsing behavior consistent across ranges instead
  // of DATE_TRUNC returning a plain TIMESTAMP that a driver could parse differently
  const bucketExpr = range === 'week'
    ? `DATE(w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}')`
    : `DATE_TRUNC('week', w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}')::date`

  const LOWER_BOUND_CLAUSES = {
    week: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '7 days'`,
    month: `AND w.date AT TIME ZONE 'UTC' AT TIME ZONE '${APP_TIMEZONE}' >= (NOW() AT TIME ZONE '${APP_TIMEZONE}') - INTERVAL '30 days'`,
    all: '',
  }

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

module.exports = router
