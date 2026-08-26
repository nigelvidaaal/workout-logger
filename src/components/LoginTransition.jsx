// CLAUDE CODE — Phase 3 ad-hoc: the post-login "success" animation Nigel
// asked for. Login.jsx renders THIS in place of the form once the server
// confirms the login worked, instead of navigating to "/" right away.
//
// It's a timed sequence of 3 phases, driven by plain setTimeout — there's
// no user interaction during this, so we don't need anything fancier:
//   1. "buffering" — a small spinner, like a request is still in flight
//   2. "logo"      — the spinner fades out, the Persist mark fades/scales in
//   3. "fadeOut"   — the mark just fades back out (see .logoFadeOut in
//                    LoginTransition.module.css) — real simple, no zoom or
//                    wipe, per Nigel's final call after a few fancier
//                    versions of this transition
// Right as the fade-out finishes, onDone() fires — Login.jsx uses that to
// navigate("/"), so the swap to the real Dashboard underneath happens at
// the exact moment the logo has fully disappeared.
import { useEffect, useState } from "react";
import styles from "../styles/LoginTransition.module.css";

// all in ms — tune these together, they're meant to line up:
// logo's own fade-in animation is 500ms, so FADE_OUT_MS gives it a beat to
// sit fully visible before fading back out; the fade-out animation itself
// is 500ms, so DONE_MS = FADE_OUT_MS + 500 is what makes onDone land
// exactly when it visually finishes (not before, not with an awkward pause)
const BUFFER_MS = 600;
const FADE_OUT_MS = 1400;
const DONE_MS = 1900;

export function LoginTransition({ onDone }) {
  const [phase, setPhase] = useState("buffering");

  useEffect(() => {
    const toLogo = setTimeout(() => setPhase("logo"), BUFFER_MS);
    const toFadeOut = setTimeout(() => setPhase("fadeOut"), FADE_OUT_MS);
    const finish = setTimeout(onDone, DONE_MS);

    // if this component unmounts early for any reason, cancel every
    // pending timer — otherwise a setPhase()/onDone() call could fire
    // after unmount and React would warn about updating an unmounted component
    return () => {
      clearTimeout(toLogo);
      clearTimeout(toFadeOut);
      clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <div className={styles.overlay}>
      {phase === "buffering" && (
        <div className={styles.spinner} role="status" aria-label="Logging in" />
      )}

      {phase !== "buffering" && (
        <img
          src="/persist_logo_trans.png"
          alt=""
          className={`${styles.logo} ${phase === "fadeOut" ? styles.logoFadeOut : ""}`}
        />
      )}
    </div>
  );
}
