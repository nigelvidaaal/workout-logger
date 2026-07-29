const pool = require('./db-pg')

// FIXED CONSTANT
const TIERS = [
  { tier: 1, threshold: 1,  name: 'First PR',         icon: '🎯' },
  { tier: 2, threshold: 5,  name: 'LFG!!', icon: '💪' },
  { tier: 3, threshold: 10, name: 'LFGGGGG!!',  icon: '🔥' },
  { tier: 4, threshold: 25, name: 'EYES IN THE SKYYY GAZING FARRR',       icon: '🦍' },
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