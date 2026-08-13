import { createPortal } from "react-dom";
import { useEffect } from "react";
import styles from "../styles/ExerciseModal.module.css";

export function ExerciseModal({ exercise, onClose }) {
  // close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    // cleanup: remove the listener when the modal closes
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
    // uses onClose prop to basically disable backdrop
    <div className={styles.backdrop} onClick={onClose}>
      {/* the panel — stopPropagation so clicking INSIDE doesn't close */}
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ×
        </button>

        <h2 className={styles.title}>{exercise.exercise_name}</h2>

        {/* badges */}
        {exercise.achievements.length > 0 && (
          <div className={styles.section}>
            <h3>Badges</h3>
            <div className={styles.badges}>
              {exercise.achievements.map((a) => (
                <div key={a.tier} className={styles.badge}>
                  <span className={styles.badgeIcon}>{a.icon}</span>
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRs */}
        <div className={styles.section}>
          <h3>Personal Records</h3>
          {exercise.prs.map((pr, i) => (
            <div key={i} className={styles.prRow}>
              <span>
                {pr.weight} lbs × {pr.reps}
              </span>
              <span className={styles.prDate}>
                {new Date(pr.achieved_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body, // ← the portal target: render into <body>
  );
}
