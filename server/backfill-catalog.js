require('dotenv').config()
const pool = require('./db-pg')

async function backfill() {
  // get all logged exercises that aren't linked yet
  const unlinked = await pool.query(
    `SELECT id, name FROM exercises WHERE catalog_id IS NULL`
  )

  console.log(`Found ${unlinked.rows.length} unlinked exercises`)

  let matched = 0

  for (const exercise of unlinked.rows) {
    // normalized exact-match against the catalog:
    // lowercase + trim both sides, compare
    const match = await pool.query(
      `SELECT id FROM exercise_catalog
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
       LIMIT 1`,
      [exercise.name]
    )

    const catalogEntry = match.rows[0]

    if (catalogEntry) {
      // link it: set this exercise's catalog_id
      await pool.query(
        `UPDATE exercises SET catalog_id = $1 WHERE id = $2`,
        [catalogEntry.id, exercise.id]
      )
      matched++
      console.log(`✓ "${exercise.name}" → ${catalogEntry.id}`)
    } else {
      console.log(`✗ "${exercise.name}" — no exact match, left unlinked`)
    }
  }

  console.log(`\nDone — ${matched} linked, ${unlinked.rows.length - matched} left NULL`)
  await pool.end()
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  pool.end()
})