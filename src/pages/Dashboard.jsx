import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW — lets us send the user to /prs on click
import { useAuth } from "../context/AuthContext";
import { getAchievements, getPRs, getTiers } from "../api/workouts";
import { AnalyticsSection } from "../components/AnalyticsSection";
import styles from "../styles/Dashboard.module.css";

export function Dashboard() {
  // two separate pieces of data, two state variables
  const [achievements, setAchievements] = useState([]);
  const [prs, setPrs] = useState([]);
  const [tiers, setTiers] = useState([]); // NEW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate(); // NEW

  async function fetchDashboard() {
    try {
      setLoading(true);
      // fire both requests in parallel
      const [achievementsData, prsData, tiersData] = await Promise.all([
        getAchievements(token),
        getPRs(token),
        getTiers(token),
      ]);
      setAchievements(achievementsData);
      setPrs(prsData);
      setTiers(tiersData);
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
          {achievements.map((a) => (
            <div
              key={a.id}
              className={styles.achievementCard}
              // navigate to "/prs", passing this achievement's exercise
              // name along so PRsPage knows which exercise card to auto-open.
              onClick={() => {
                // "unless navigate() was called WITH a state object"
                navigate("/prs", { state: { exerciseName: a.exerciseName } });
              }}
            >
              <span className={styles.icon}>{a.icon}</span>
              <div>
                <p className={styles.achievementName}>{a.name}</p>
                <p className={styles.achievementExercise}>{a.exercise_name}</p>
              </div>
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
