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

// separate from LOWER_BOUND_CLAUSES above: body_weight.date is already a plain
// DATE (not a naive-UTC timestamp like w.date), so the column itself needs no
// AT TIME ZONE reinterpretation — only the "today" reference point does, same
// as everywhere else in this app
const BODY_WEIGHT_RANGE_CLAUSES = {
  week: `AND date >= (NOW() AT TIME ZONE '${APP_TIMEZONE}')::date - INTERVAL '7 days'`,
  month: `AND date >= (NOW() AT TIME ZONE '${APP_TIMEZONE}')::date - INTERVAL '30 days'`,
  all: '',
}

// POST /api/analytics/body-weight — upsert today's weight (one row per user per day).
// "today" is anchored to APP_TIMEZONE, not bare CURRENT_DATE (UTC) — otherwise an
// evening log for a Pacific-time user could upsert under tomorrow's UTC date, and
// the ON CONFLICT (user_id, date) same-day-replaces behavior would key off the wrong day
router.post('/body-weight', requireAuth, async (req, res) => {
  const weight = Number(req.body.weight)
  if (!Number.isFinite(weight) || weight <= 0) {
    return res.status(400).json({ error: 'weight must be a positive number' })
  }

  const result = await pool.query(`
    INSERT INTO body_weight (user_id, weight, date)
    VALUES ($1, $2, (NOW() AT TIME ZONE '${APP_TIMEZONE}')::date)
    ON CONFLICT (user_id, date)
    DO UPDATE SET weight = EXCLUDED.weight
    RETURNING *
  `, [req.userId, weight])

  res.status(201).json(result.rows[0])
})

// GET /api/analytics/body-weight?range=week|month|all
// daily weights oldest->newest, plus a 7-day moving-average trendline computed
// here in JS (not SQL) per spec
router.get('/body-weight', requireAuth, async (req, res) => {
  const range = ALLOWED_RANGES.includes(req.query.range) ? req.query.range : 'week'

  const result = await pool.query(`
    SELECT date, weight
    FROM body_weight
    WHERE user_id = $1
      ${BODY_WEIGHT_RANGE_CLAUSES[range]}
    ORDER BY date ASC
  `, [req.userId])

  // each row averages itself + up to 6 prior LOGGED rows (not calendar days —
  // early rows in the range simply average over fewer points)
  const rows = result.rows.map((row, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1)
    const avg = window.reduce((sum, r) => sum + Number(r.weight), 0) / window.length
    return { date: row.date, weight: Number(row.weight), trend: Math.round(avg * 10) / 10 }
  })

  res.json(rows)
})

module.exports = router
