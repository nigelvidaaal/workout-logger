const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')

// GET /api/catalog?q=... — typeahead search against the seeded exercise_catalog
// CLAUDE CODE — bug/feature: LEFT JOINs this user's own favorites so each
// result carries is_favorited (powers the star icon in ExerciseSearch.jsx),
// and orders favorited matches first — so once "Tricep Extension" is
// starred, searching "Tricep" again always puts it at the top instead of
// wherever alphabetical order happens to land it.
router.get('/', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()

  // no query — skip the DB entirely rather than running a %%-matches-everything scan
  if (!q) return res.json([])

  const result = await pool.query(
    `SELECT
       ec.id,
       ec.name,
       ec.primary_muscles,
       (f.catalog_id IS NOT NULL) AS is_favorited
     FROM exercise_catalog ec
     LEFT JOIN favorites f
       ON f.catalog_id = ec.id AND f.user_id = $2
     WHERE ec.name ILIKE $1
     ORDER BY is_favorited DESC, ec.name
     LIMIT 20`,
    [`%${q}%`, req.userId]
  )

  res.json(result.rows)
})

module.exports = router
