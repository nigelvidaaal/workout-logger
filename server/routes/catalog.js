const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')

// GET /api/catalog?q=... — typeahead search against the seeded exercise_catalog
router.get('/', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()

  // no query — skip the DB entirely rather than running a %%-matches-everything scan
  if (!q) return res.json([])

  const result = await pool.query(
    'SELECT id, name, primary_muscles FROM exercise_catalog WHERE name ILIKE $1 ORDER BY name LIMIT 20',
    [`%${q}%`]
  )

  res.json(result.rows)
})

module.exports = router
