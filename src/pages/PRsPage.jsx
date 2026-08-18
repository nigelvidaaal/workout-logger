import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"; // NEW — reads what Dashboard.jsx passed via navigate()
import { useAuth } from "../context/AuthContext";
import { getPRSummary } from "../api/workouts";
import { ExerciseModal } from "../components/ExerciseModal";
import styles from "../styles/PRsPage.module.css";

export function PRsPage() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const { token } = useAuth();
  const location = useLocation(); // NEW

  useEffect(() => {
    async function load() {
      try {
        const data = await getPRSummary(token);
        setExercises(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW — once `exercises` has loaded AND we arrived here via an achievement
  // click (i.e. navigate() was called with a state object), auto-open that
  // exercise's modal — same end result as the user clicking its card by hand.
  //
  // This has to be its OWN effect, separate from the fetch above: the fetch
  // effect runs once on mount, before `exercises` has any data yet — there'd
  // be nothing to search through if this logic lived there too. This effect
  // re-runs whenever `exercises` changes, so once the fetch finishes and
  // `exercises` actually has rows in it, this gets its turn to look through them.
  useEffect(() => {
    // TODO 1: if there's nothing to look for then basically return undefined

    // Use whatever key name you picked in Dashboard.jsx's TODO — they have to
    // match exactly, since this is just reading back the object you built there.
    if (!location.state?.exerciseName) {
      return;
    }

    // TODO 2: find the matching exercise in the array that's already loaded.
    // compare case insentively, get toLowerCase() both sides as instructed
    const match = exercises.find((ex) => {
      ex.name.toLowerCase() === location.state.exerciseName.toLowerCase();
    });

    // TODO 3:  if match found then open up the modal
    if (match) {
      ExerciseModal(match);
    }
  }, [exercises, location.state]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1>Personal Records</h1>

      {exercises.length === 0 && (
        <p className={styles.empty}>No PRs yet. Let's go hit one!</p>
      )}

      <div className={styles.grid}>
        {exercises.map((ex) => (
          <div
            key={ex.exercise_name}
            className={styles.card}
            onClick={() => setSelectedExercise(ex)}
          >
            <h3 className={styles.cardName}>{ex.exercise_name}</h3>

            {/* preview: top badge icon + counts */}
            <div className={styles.cardMeta}>
              {ex.achievements.length > 0 && (
                <span className={styles.topBadge}>
                  {ex.achievements[ex.achievements.length - 1].icon}
                </span>
              )}
              <span className={styles.count}>{ex.prs.length} PRs</span>
              <span className={styles.count}>
                {ex.achievements.length} badges
              </span>
            </div>
          </div>
        ))}
      </div>
      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
}
