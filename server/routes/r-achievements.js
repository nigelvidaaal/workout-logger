const express = require('express')
const router = express.Router();
const db = require('../db')
const requireAuth = require('../middleware/auth')

// GET /api/achievements — all achievements for the logged-in user
router.get('/', requireAuth, (req, res) => {
  // remember, getting ALL (so, .all() should be used)
  const achievements = db.prepare(
    'SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC'
  ).all(req.userId)

  res.json(achievements)
})

module.exports = router