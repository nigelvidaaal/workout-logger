import { createPortal } from "react-dom";
import { useEffect } from "react";
import styles from "../styles/ConfirmModal.module.css";

// CLAUDE CODE — punch list: "are you sure you want to log out?" Built as a
// generic yes/no confirm dialog (not logout-specific) so it can be reused
// later for any other destructive/one-way action in the app — "Delete
// Workout" and "Delete Exercise" currently fire immediately with no
// confirmation either, same shape of risk, worth revisiting later.
// Same modal chrome/pattern as TierModal.jsx (backdrop + centered panel,
// Escape to close, body-scroll lock, bottom-sheet on mobile) so it looks
// like it belongs in this app instead of a native browser confirm() popup —
// window.confirm() also can't be styled at all and looks jarring against
// this dark theme, which is the other reason not to just use that.
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.dangerBtn : styles.confirmBtn}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
