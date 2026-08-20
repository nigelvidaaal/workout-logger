import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW — lets us send the user to /prs on click
import { useAuth } from "../context/AuthContext";
import { getAchievements, getPRs, getTiers, getMuscleSets } from "../api/workouts";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { buildMuscleBalance } from "../utils/muscleBalance"; // Phase 3 Part 2 — sets/week per group, all 10 shown
import styles from "../styles/Dashboard.module.css";

export function Dashboard() {
  // two separate pieces of data, two state variables
  const [achievements, setAchievements] = useState([]);
  const [prs, setPrs] = useState([]);
  const [tiers, setTiers] = useState([]); // NEW
  const [muscleSets, setMuscleSets] = useState({}); // Phase 3 Part 2 — feeds Muscle Balance boxes below
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate(); // NEW

  async function fetchDashboard() {
    try {
      setLoading(true);
      // fire both requests in parallel
      // "week" matches the "sets/WEEK" target the Muscle Balance boxes
      // are measuring against — getMuscleSets defaults to "week" too, but
      // being explicit here keeps this call self-documenting
      const [achievementsData, prsData, tiersData, muscleSetsData] = await Promise.all([
        getAchievements(token),
        getPRs(token),
        getTiers(token),
        getMuscleSets(token, "week"),
      ]);
      setAchievements(achievementsData);
      setPrs(prsData);
      setTiers(tiersData);
      setMuscleSets(muscleSetsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // fetch on mount — empty dependency array means "run once when page loads"
  useEffect(() => {
    // eslint-disable-next-line
    fetchDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // takes the flat PR list, returns one entry per exercise with count + best weight
  function groupPRsByExercise(prs) {
    // accumulator: an object keyed by exercise name
    const groups = {};

    for (const pr of prs) {
      // has this exercise been seen yet?
      if (!groups[pr.exercise_name]) {
        // first time seeing it — initialize its entry
        groups[pr.exercise_name] = {
          exercise_name: pr.exercise_name,
          count: 0,
          best: 0,
        };
      }

      // update the running tally for this exercise
      groups[pr.exercise_name].count++; // one more PR
      groups[pr.exercise_name].best = Math.max(
        groups[pr.exercise_name].best,
        pr.weight, // this PR's weight
      );
    }

    // groups is an OBJECT — convert it to an ARRAY so we can .map() it in JSX
    return Object.values(groups);
  }

  // given a PR count and the tier list, returns progress info toward the next tier
  function getTierProgress(count, tiers) {
    // find the first tier whose threshold is GREATER than the current count
    // that's the next one the user hasn't reached yet
    const nextTier = tiers.find((t) => t.threshold > count);

    // if there's no such tier, the user has maxed out every tier
    if (!nextTier) {
      return { maxed: true };
    }

    // how many more PRs until that next tier unlocks?
    const remaining = nextTier.threshold - count;

    return {
      maxed: false,
      nextName: nextTier.name,
      nextIcon: nextTier.icon,
      remaining: remaining,
    };
  }

  // early returns — same pattern as every page
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // transform the raw PR list into grouped cards — done once per render, here
  const groupedPRs = groupPRsByExercise(prs);
  // Phase 3 Part 2 — one entry per muscle group, each with its own
  // gradient color; no more top-3/bottom-3 split (see muscleBalance.js)
  const muscleBalance = buildMuscleBalance(muscleSets);

  // NEW — "major" achievements = highest tier first (tier 7 "Goat." is the
  // most impressive, tier 1 "First PR" the least — see server/achievements.js),
  // not chronological, so the row leads with your best unlocks rather than
  // just whatever happened most recently. Capped so the scroll row stays a
  // quick skim; a "More" card appears whenever there's more to see.
  const MAX_ACHIEVEMENTS_SHOWN = 6;
  const majorAchievements = [...achievements]
    .sort((a, b) => b.tier - a.tier)
    .slice(0, MAX_ACHIEVEMENTS_SHOWN);
  const hasMoreAchievements = achievements.length > MAX_ACHIEVEMENTS_SHOWN;

  return (
    <div className={styles.container}>
      {/* ─── ANALYTICS ─── */}
      <section className={styles.section}>
        <h2>Analytics</h2>
        <AnalyticsSection />
      </section>

      {/* ─── ACHIEVEMENTS ─── */}
      <section className={styles.section}>
        <h2>Achievements</h2>
        {achievements.length === 0 && (
          <p className={styles.empty}>No achievements yet. Go hit a PR!</p>
        )}
        <div className={styles.achievementGrid}>
          {majorAchievements.map((a) => (
            <div
              key={a.id}
              className={styles.achievementCard}
              // navigate to "/prs", passing this achievement's exercise name
              // along so PRsPage knows which exercise card to auto-open.
              onClick={() => {
                navigate("/prs", { state: { exerciseName: a.exercise_name } });
              }}
            >
              <span className={styles.icon}>{a.icon}</span>
              <div>
                <p className={styles.achievementName}>{a.name}</p>
                <p className={styles.achievementExercise}>{a.exercise_name}</p>
              </div>
            </div>
          ))}
          {/* trailing card — only shows once there's more than fits above.
              plain /prs, no exerciseName state, since this isn't about any
              one exercise — it's "see everything" */}
          {hasMoreAchievements && (
            <button
              type="button"
              className={styles.moreCard}
              onClick={() => navigate("/prs")}
            >
              <span>More</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── MUSCLE BALANCE — every group against a 10-20 sets/week target ─── */}
      <section className={styles.section}>
        <h2>Muscle Balance</h2>
        <p className={styles.balanceHint}>Target: 10–20 sets/week per muscle group</p>
        <div className={styles.balanceGrid}>
          {muscleBalance.map((m) => (
            // color is a computed gradient (muscleBalance.js), not a fixed
            // CSS class, so it's set inline via a CSS custom property —
            // borderLeftColor directly would work too, but this keeps the
            // color logic visible in one place (the .module.css rule) if
            // the box's styling changes later
            <div
              key={m.value}
              className={styles.balanceBox}
              style={{ "--balance-color": m.color }}
            >
              <span className={styles.balanceBoxName}>{m.label}</span>
              <span className={styles.balanceBoxTonnage}>
                {m.setsPerWeek} {m.setsPerWeek === 1 ? "set" : "sets"}/wk
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRs, grouped by exercise, with tier progress ─── */}
      <section className={styles.section}>
        <h2>Personal Records</h2>
        {groupedPRs.length === 0 && (
          <p className={styles.empty}>No PRs logged yet.</p>
        )}
        <div className={styles.prList}>
          {groupedPRs.map((group) => {
            // for THIS exercise, compute progress toward its next tier
            const progress = getTierProgress(group.count, tiers);
            return (
              <div key={group.exercise_name} className={styles.prCard}>
                <div className={styles.prCardHeader}>
                  <span className={styles.prExercise}>
                    {group.exercise_name}
                  </span>
                  <span className={styles.prBest}>Best: {group.best}kg</span>
                </div>
                <div className={styles.prCardFooter}>
                  <span className={styles.prCount}>{group.count} PRs</span>
                  {progress.maxed ? (
                    <span className={styles.prNext}>
                      🏆 All tiers unlocked!
                    </span>
                  ) : (
                    <span className={styles.prNext}>
                      {progress.nextIcon} {progress.remaining} more to{" "}
                      {progress.nextName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
