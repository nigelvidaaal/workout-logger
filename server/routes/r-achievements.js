const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')
const { TIERS } = require('../achievements')

// GET /api/achievements - for user's achievements basically 
router.get('/', requireAuth, async (req, res) => {
  
  const result = await pool.query(
    'SELECT * FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC', 
    [req.userId]
  )

  // getting all, meaning ROWS not just rows[0]
  const achievements = result.rows

  // attach name + icon to each row by looking up its tier in TIERS
  const enriched = achievements.map((a) => {
    // find the TIERS entry whose tier number matches this row's tier
    const tierInfo = TIERS.find((t) => t.tier === a.tier)
    return {
      ...a,
      name: tierInfo.name,
      icon: tierInfo.icon,
    }
  })

  res.json(enriched)
})

// GET /api/achievements/tiers — the tier definitions (rules), so the frontend
// can compute "progress to next tier" without duplicating the thresholds
router.get('/tiers', requireAuth, (req, res) => {
  res.json(TIERS)
})

module.exports = router