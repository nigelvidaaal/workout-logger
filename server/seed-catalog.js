// one-time script: fetches the free-exercise-db catalog and loads it into exercise_catalog
// run with: node seed-catalog.js
// safe to re-run — ON CONFLICT (id) DO NOTHING skips exercises already seeded
require('dotenv').config()
const pool = require('./db-pg')

const CATALOG_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

async function seed() {
  console.log('Fetching exercise catalog...')
  const response = await fetch(CATALOG_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`)
  }
  const exercises = await response.json()
  console.log(`Fetched ${exercises.length} exercises — inserting...`)

  let inserted = 0
  for (const exercise of exercises) {
    // result.rowCount is 1 when the row was actually inserted, 0 when
    // ON CONFLICT DO NOTHING skipped it (already seeded on a prior run)
    const result = await pool.query(
      `INSERT INTO exercise_catalog (id, name, equipment, category, primary_muscles, secondary_muscles)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        exercise.id,
        exercise.name,
        exercise.equipment,
        exercise.category,
        exercise.primaryMuscles || [],
        exercise.secondaryMuscles || [],
      ]
    )
    if (result.rowCount > 0) inserted++
  }

  console.log(`Done — ${inserted} new exercises inserted, ${exercises.length - inserted} already existed`)
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  pool.end()
})
