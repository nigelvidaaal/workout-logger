import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPRSummary, getTiers } from "../api/workouts";
import { TierModal } from "../components/TierModal";
import styles from "../styles/PRsPage.module.css";

// CLAUDE CODE — CHANGE 2 (part 2): same tier-number -> image mapping as
// Dashboard.jsx's achievement cards. Kept local rather than shared since
// there's no shared-constants file for the frontend yet — worth extracting
// if a third page ends up needing it.
const TIER_IMAGES = {
  1: "/achievements picture/tier_1.png",
  2: "/achievements picture/tier_2.png",
  3: "/achievements picture/tier_3.jpg",
  4: "/achievements picture/tier_4.png",
  5: "/achievements picture/tier_5.jpg",
  6: "/achievements picture/tier_6.jpg",
  7: "/achievements picture/tier_7.png",
};

export function PRsPage() {
  const [exercises, setExercises] = useState([]);
  const [tiers, setTiers] = useState([]); // NEW — full tier rule list, same as Dashboard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null); // NEW — a tier object, not an exercise
  const { token } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const [exercisesData, tiersData] = await Promise.all([
          getPRSummary(token),
          getTiers(token),
        ]);
        setExercises(exercisesData);
        setTiers(tiersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CLAUDE CODE — CHANGE 2 (part 2): given a tier number, returns every
  // exercise that has unlocked it (an exercise "hits" a tier if that tier
  // shows up in its own achievements array — see server/routes/workouts.js
  // pr-summary), enriched with best weight + total PR count so the modal
  // has more to show than just a bare name.
  function getExercisesForTier(tierNumber) {
    return exercises
      .filter((ex) => ex.achievements.some((a) => a.tier === tierNumber))
      .map((ex) => ({
        exercise_name: ex.exercise_name,
        best: ex.prs.reduce((max, pr) => Math.max(max, pr.weight), 0),
        count: ex.prs.length,
      }))
      .sort((a, b) => b.best - a.best); // heaviest lift first
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // CLAUDE CODE — CHANGE 2 (part 2): this page used to be exercise-first (a
  // grid of exercises; clicking one opened ITS badges/PRs). Nigel's new
  // design flips it to tier-first: every one of the 7 tiers always gets a
  // card; clicking an unlocked one pops a modal listing which exercises
  // earned it, instead of the old per-exercise modal. Unlike the Dashboard's
  // horizontally-scrolling achievement row, this is a vertical stack running
  // First PR (lowest tier) at the top down to Goat (highest) at the bottom —
  // ascending order, opposite of Dashboard's.
  const allTierCards = [...tiers].sort((a, b) => a.tier - b.tier);

  return (
    <div className={styles.container}>
      <h1>Personal Records</h1>

      <div className={styles.tierGrid}>
        {allTierCards.map((t) => {
          const qualifying = getExercisesForTier(t.tier);
          const unlocked = qualifying.length > 0;
          return (
            <div
              key={t.tier}
              className={`${styles.tierCard} ${unlocked ? "" : styles.tierCardLocked}`}
              // locked tiers have no exercises to show — nothing to click
              // through to
              onClick={unlocked ? () => setSelectedTier(t) : undefined}
            >
              <img
                src={encodeURI(TIER_IMAGES[t.tier])}
                alt=""
                className={styles.tierImage}
              />
              <p className={styles.tierName}>{t.name}</p>
              {!unlocked && (
                <span className={styles.lockedBadge} aria-hidden="true"></span>
              )}
            </div>
          );
        })}
      </div>

      {selectedTier && (
        <TierModal
          tier={selectedTier}
          exercises={getExercisesForTier(selectedTier.tier)}
          onClose={() => setSelectedTier(null)}
        />
      )}
    </div>
  );
}
