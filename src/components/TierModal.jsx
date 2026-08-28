import { createPortal } from "react-dom";
import { useEffect } from "react";
import styles from "../styles/TierModal.module.css";

// CLAUDE CODE — CHANGE 2 (part 2): replaces the old per-exercise
// ExerciseModal (deleted — it's now unused). That modal answered "what has
// THIS exercise earned?"; PRsPage.jsx is now tier-first, so this modal
// answers the inverse question instead: "which exercises earned THIS tier?"
export function TierModal({ tier, exercises, onClose }) {
  // close on Escape key — same pattern as the old ExerciseModal
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // lock background scroll while the modal is mounted, restore on close
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2 className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true">
            {tier.icon}
          </span>{" "}
          {tier.name}
        </h2>
        <p className={styles.subtitle}>{tier.threshold} PRs on an exercise</p>

        <div className={styles.section}>
          <h3>Exercises</h3>
          {exercises.map((ex) => (
            <div key={ex.exercise_name} className={styles.exerciseRow}>
              <span className={styles.exerciseName}>{ex.exercise_name}</span>
              <span className={styles.exerciseMeta}>
                {ex.best} lbs · {ex.count} PRs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
