const express = require('express')
const router = express.Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

// GET /api/prs — all PRs for the logged-in user
router.get('/', requireAuth, (req, res) => {
  // remember, getting ALL (so, .all() should be used)
  const prs = db.prepare(
    'SELECT * FROM prs WHERE user_id = ? ORDER BY achieved_at DESC'
  ).all(req.userId)

  res.json(prs)
})

module.exports = router