import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMuscleVolume } from "../api/workouts";
import { MuscleBodyChart } from "../components/MuscleBodyChart";
import { getFill, getTierLabel } from "../utils/muscleFill";
import { MUSCLE_GROUPS } from "../constants/muscleGroups";
import styles from "../styles/MuscleChart.module.css";

export function MuscleChart() {
  const [view, setView] = useState("front");
  const [volume, setVolume] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { token } = useAuth();

  useEffect(() => {
    async function fetchVolume() {
      try {
        setLoading(true);
        const data = await getMuscleVolume(token);
        setVolume(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchVolume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // volume is [{ muscle_group, tonnage }] for groups with logged data — turn it
  // into a lookup, then scale every group 0..1 relative to whichever is highest
  const tonnageByGroup = {};
  for (const row of volume) {
    tonnageByGroup[row.muscle_group] = Number(row.tonnage);
  }

  const maxTonnage = Math.max(0, ...Object.values(tonnageByGroup));

  const intensityByGroup = {};
  for (const group of MUSCLE_GROUPS) {
    intensityByGroup[group.value] = maxTonnage > 0
      ? (tonnageByGroup[group.value] ?? 0) / maxTonnage
      : 0;
  }

  return (
    <div className={styles.container}>
      <h1>Muscle Chart</h1>

      {volume.length === 0 && (
        <p className={styles.empty}>
          No tagged training data yet — tag an exercise with a muscle group
          and log a set to see it here.
        </p>
      )}

      <div className={styles.toggleRow}>
        <button
          className={`${styles.toggleBtn} ${view === "front" ? styles.toggleBtnActive : ""}`}
          onClick={() => setView("front")}
        >
          Front
        </button>
        <button
          className={`${styles.toggleBtn} ${view === "back" ? styles.toggleBtnActive : ""}`}
          onClick={() => setView("back")}
        >
          Back
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.chartWrap}>
          <MuscleBodyChart view={view} intensityByGroup={intensityByGroup} />
        </div>

        <div className={styles.legend}>
          {MUSCLE_GROUPS.map((group) => (
            <div key={group.value} className={styles.legendRow}>
              <span className={styles.legendName}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: getFill(group.value, intensityByGroup) }}
                />
                {group.label}
              </span>
              <span className={styles.legendTonnage}>
                {tonnageByGroup[group.value] ? (
                  <>
                    {getTierLabel(group.value, intensityByGroup)} ·{" "}
                    {tonnageByGroup[group.value].toLocaleString()} lbs
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
