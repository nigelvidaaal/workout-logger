// favorite toggle feature for user 
const express = require('express')
const router = express.Router()
const pool = require('../db-pg')
const requireAuth = require('../middleware/auth')

// POST /api/favorites/:catalogId — favorite a catalog exercise for this user.
router.post('/:catalogId', requireAuth, async (req, res) => {
  const { catalogId } = req.params

  // the exercise has to actually exist in the catalog — otherwise this would
  // either silently create a favorite pointing at nothing, or throw a raw
  // foreign-key error that doesn't read as "bad catalogId" to the client
  const catalogResult = await pool.query(
    'SELECT id FROM exercise_catalog WHERE id = $1',
    [catalogId]
  )
  if (!catalogResult.rows[0]) {
    return res.status(404).json({ error: 'Exercise not found in catalog' })
  }

  try {
    // favoriting an already-favorited exercise is a no-op, not an error 
    await pool.query(
      `INSERT INTO favorites (user_id, catalog_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, catalog_id) DO NOTHING`,
      [req.userId, catalogId]
    )
    res.status(201).json({ catalogId, favorited: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to favorite exercise' })
  }
})

// DELETE /api/favorites/:catalogId — unfavorite. Deleting a row that isn't
// there is already a no-op in SQL, so no existence check needed here.
router.delete('/:catalogId', requireAuth, async (req, res) => {
  const { catalogId } = req.params

  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND catalog_id = $2',
      [req.userId, catalogId]
    )
    res.json({ catalogId, favorited: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to unfavorite exercise' })
  }
})

module.exports = router
