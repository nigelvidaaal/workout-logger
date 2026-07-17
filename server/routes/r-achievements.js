const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { TIERS } = require('../achievements')

// GET /api/achievements - for user's achievements basically 
router.get('/', requireAuth, (req, res) => {
  const achievements = db.prepare(
    'SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
  ).all(req.userId)

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

module.exports = router