const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')

// GET /api/prs — all PRs for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  // same situation on r-achievements.js, ALL not just one 
  const result = await pool.query(
    'SELECT * FROM prs WHERE user_id = $1 ORDER BY achieved_at DESC', 
    [req.userId]
  )

  const prs = result.rows

  res.json(prs)
})

module.exports = router