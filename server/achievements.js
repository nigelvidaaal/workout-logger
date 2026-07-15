const db = require('./db')

// FIXED CONSTANT
const TIERS = [
  { tier: 1, threshold: 1,  name: 'First PR',         icon: '🎯' },
  { tier: 2, threshold: 5,  name: 'LFG!!', icon: '💪' },
  { tier: 3, threshold: 10, name: 'LFGGGGG!!',  icon: '🔥' },
  { tier: 4, threshold: 25, name: 'EYES IN THE SKYYY GAZING FARRR',       icon: '🦍' },
]

// checks PR count for one exercise and unlocks any newly-earned tiers.
// returns an array of the tiers unlocked DURING THIS CALL (usually 0 or 1),
// so the caller can tell the frontend what to celebrate.
function checkAchievements(userId, exerciseName) {

  // count this user's PRs for this exercise
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM prs
    WHERE user_id = ?
      AND LOWER(exercise_name) = LOWER(?)
  `).get(userId, exerciseName)

  const prCount = row.count

  // array of pr, will display if a new PR is unlocked
  const prUnlocked = []

  // STEP 2: walk every tier and see which ones this PR count qualifies for
  for (const t of TIERS) {

    // conditionals before topping a PR 
    if (prCount >= t.threshold) {

      // CODE GUARD: is this tier already unlocked? (idempotency)
      const existing = db.prepare(`
        SELECT * FROM achievements
        WHERE user_id = ? AND LOWER(exercise_name) = LOWER(?) AND tier = ?
      `).get(userId, exerciseName, t.tier)

      // only insert if it does NOT already exist
      if (!existing) {
        db.prepare(`
          INSERT INTO achievements (user_id, exercise_name, tier)
          VALUES (?, ?, ?)
        `).run(userId, exerciseName, t.tier)

        // push out the pr to process
        prUnlocked.push(t)
      }
    }
  }

  // display pr! 
  return prUnlocked
}

module.exports = checkAchievements