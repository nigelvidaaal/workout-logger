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

  useEffect(() => {
    // bail out if there's nothing to look for — location.state is undefined
    // unless navigate() was called WITH a state object (typing the URL,
    // clicking "PRs" in the navbar both leave it undefined).
    if (!location.state?.exerciseName) {
      return;
    }

    // find the matching exercise in the array that's already loaded, compared
    // case-insensitively — the achievement's exercise name and this list's
    // exercise name
    const match = exercises.find(
      (ex) =>
        ex.exercise_name.toLowerCase() ===
        location.state.exerciseName.toLowerCase(),
    );

    // if nothing matched (exercises hasn't finished loading yet on this
    // particular render, or something genuinely doesn't exist), do nothing —
    // this effect runs again once `exercises` updates, per the deps below.
    if (match) {
      // eslint-disable-next-line
      setSelectedExercise(match);
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
