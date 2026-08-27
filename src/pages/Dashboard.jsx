import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // NEW — lets us send the user to /prs on click
import { useAuth } from "../context/AuthContext";
import {
  getAchievements,
  getPRs,
  getTiers,
  getMuscleSets,
} from "../api/workouts";
import { AnalyticsSection } from "../components/AnalyticsSection";
import { HistoryCalendar } from "../components/HistoryCalendar"; // Phase 3 Part 3 — weekly workout calendar
import { buildMuscleBalance } from "../utils/muscleBalance"; // Phase 3 Part 2 — sets/week per group, all 10 shown
import styles from "../styles/Dashboard.module.css";

// CLAUDE CODE — CHANGE 2 (part 1): background image for each achievement
// tier's card, from /public/achievements picture/. Nigel renamed the files
// to tier_1..tier_7 (matching server/achievements.js's TIERS by number
// instead of by name), so this no longer needs to account for casing/
// spacing/punctuation mismatches — just the file extension, which is still
// a mix of .png/.jpg tier to tier.
const TIER_IMAGES = {
  1: "/achievements picture/tier_1.png",
  2: "/achievements picture/tier_2.png",
  3: "/achievements picture/tier_3.jpg",
  4: "/achievements picture/tier_4.png",
  5: "/achievements picture/tier_5.jpg",
  6: "/achievements picture/tier_6.jpg",
  7: "/achievements picture/tier_7.png",
};

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
      const [achievementsData, prsData, tiersData, muscleSetsData] =
        await Promise.all([
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

  // CLAUDE CODE — CHANGE 2 (part 1): `achievements` is a flat list of
  // unlock ROWS — one per user+exercise+tier, since the server tracks PRs
  // (and therefore tier unlocks) separately per exercise. That used to mean
  // the same tier (e.g. "First PR") could show up as several near-identical
  // cards, once per exercise that earned it. Per Nigel: showcase the
  // ACHIEVEMENT itself, not each exercise instance of it — so dedupe down
  // to one card per distinct tier the user has EVER unlocked (whichever
  // exercise's row happens to be first is fine, since every row for the
  // same tier has the same name/icon anyway), highest tier first.
  const MAX_ACHIEVEMENTS_SHOWN = 6;
  const unlockedTiers = new Map();
  for (const a of achievements) {
    if (!unlockedTiers.has(a.tier)) unlockedTiers.set(a.tier, a);
  }
  const majorAchievements = [...unlockedTiers.values()]
    .sort((a, b) => b.tier - a.tier)
    .slice(0, MAX_ACHIEVEMENTS_SHOWN);
  const hasMoreAchievements = unlockedTiers.size > MAX_ACHIEVEMENTS_SHOWN;

  // page date header
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.container}>
      {/* ─── PAGE HEADER — Phase 3 Part 4: today's date above the title ─── */}
      <div className={styles.pageHeader}>
        <p className={styles.pageDate}>{todayLabel}</p>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>

      {/* ─── ANALYTICS ─── */}
      <section className={styles.section}>
        <h2>Analytics</h2>
        <AnalyticsSection />
      </section>

      {/* ─── HISTORY — Phase 3 Part 3: weekly calendar of logged workouts ─── */}
      <section className={styles.section}>
        <h2>History</h2>
        <HistoryCalendar />
      </section>

      {/* ─── ACHIEVEMENTS — Phase 3 Part 4: wrapped in the "glass container" ─── */}
      <section className={styles.section}>
        <h2>Achievements</h2>
        {achievements.length === 0 && (
          <p className={styles.empty}>No achievements yet. Go hit a PR!</p>
        )}
        <div className={styles.achievementGrid}>
          {majorAchievements.map((a) => (
            <div
              key={a.tier}
              className={styles.achievementCard}
              // CLAUDE CODE — no longer tied to one specific exercise (this
              // card now represents the TIER itself, which any number of
              // exercises may have earned) — plain /prs, same as the
              // "More" card below
              onClick={() => navigate("/prs")}
            >
              <img
                src={encodeURI(TIER_IMAGES[a.tier])}
                alt=""
                className={styles.achievementImage}
              />
              <p className={styles.achievementName}>{a.name}</p>
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

      {/* ─── MUSCLE BALANCE — every group against a 10-20 sets/week target,
          Phase 3 Part 4: wrapped in the "glass container" ─── */}
      <section className={`${styles.section} ${styles.glass}`}>
        <h2>Muscle Balance</h2>
        <p className={styles.balanceHint}>
          Target: 10–20 sets/week per muscle group
        </p>
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
                {m.setsPerWeek} {m.setsPerWeek === 1 ? "set" : "sets"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRs, grouped by exercise, with tier progress —
          Phase 3 Part 4: wrapped in the "glass container" ─── */}
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
