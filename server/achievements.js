const pool = require('./db-pg')

// FIXED CONSTANT
// tiers 1-4 are load-bearing: existing unlocked achievement rows in the DB
// reference these by `tier` number, so they must stay byte-for-byte identical
// (same tier/threshold/name/icon). New tiers are appended ABOVE the existing
// max threshold, never inserted in between — getTierProgress() (Dashboard.jsx)
// scans this array in order looking for the first threshold greater than the
// user's count, so it depends on TIERS staying sorted ascending by threshold.
const TIERS = [
  { tier: 1, threshold: 1,   name: 'First PR', icon: '🎯' },
  { tier: 2, threshold: 5,   name: 'Pace Setter', icon: '💪' },
  { tier: 3, threshold: 10,  name: 'Groundbreaker', icon: '🔥' },
  { tier: 4, threshold: 25,  name: 'Defying Expectations', icon: '🦍' },
  { tier: 5, threshold: 40,  name: 'Unstoppable', icon: '🚀' },
  { tier: 6, threshold: 65,  name: 'EYES IN THE SKY, GAZING FAR..', icon: '👹' },
  { tier: 7, threshold: 100, name: 'Goat.', icon: '🐐' },
]

// checks PR count for one exercise and unlocks any newly-earned tiers.
async function checkAchievements(userId, exerciseName) {

  // count this user's PRs for this exercise
  const result = await pool.query(`
    SELECT COUNT(*) AS count
    FROM prs
    WHERE user_id = $1
      AND LOWER(exercise_name) = LOWER($2)
  `, [userId, exerciseName])

  const prCount = parseInt(result.rows[0].count, 10)

  // array of pr, will display if a new PR is unlocked
  const prUnlocked = []

  // STEP 2: walk every tier and see which ones this PR count qualifies for
  for (const t of TIERS) {

    // conditionals before topping a PR 
    if (prCount >= t.threshold) {

      // CODE GUARD: is this tier already unlocked? (idempotency)
      const existingResult = await pool.query(`
        SELECT * FROM achievements
        WHERE user_id = $1 AND LOWER(exercise_name) = LOWER($2) AND tier = $3
      `, [userId, exerciseName, t.tier])

      const existing = existingResult.rows[0]
      
      // only insert if it does NOT already exist
      if (!existing) {
        await pool.query(`
          INSERT INTO achievements (user_id, exercise_name, tier)
          VALUES ($1, $2, $3)
        `,[userId, exerciseName, t.tier])

        // push out the pr to process
        prUnlocked.push(t)
      } 
    }
  }

  // display pr! 
  return prUnlocked
}

// exporting tier so route files can use it too 
module.exports = {checkAchievements, TIERS}