import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPRSummary } from "../api/workouts";
import styles from "../styles/PRsPage.module.css";

export function PRsPage() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1>Personal Records</h1>

      {exercises.length === 0 && (
        <p className={styles.empty}>No PRs yet. Go hit one!</p>
      )}

      <div className={styles.grid}>
        {exercises.map((ex) => (
          <div key={ex.exercise_name} className={styles.card}>
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
    </div>
  );
}
