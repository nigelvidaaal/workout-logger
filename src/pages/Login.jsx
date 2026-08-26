import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// renamed import; lets you import something under a different local name.
import { login as loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { LoginTransition } from "../components/LoginTransition"; // CLAUDE CODE — post-login zoom animation
import styles from "../styles/Auth.module.css";

export function Login() {
  // formData — same controlled input pattern from Task Manager
  const [formData, setFormData] = useState({ username: "", password: "" });
  // error — to show "Invalid credentials" if login fails
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // CLAUDE CODE — bumped by 1 on every failed attempt. Passed to the form
  // as a `key` below, which forces React to remount it — that's what lets
  // the shake CSS animation replay on a SECOND wrong attempt in a row. If
  // we just toggled a boolean instead, the form's class name wouldn't
  // change between two failed attempts, and a CSS animation never restarts
  // just because the class attribute was set to the same value it already had.
  const [shakeCount, setShakeCount] = useState(0);
  // CLAUDE CODE — true once the server confirms login; while true, the
  // whole form is replaced by the full-screen success animation
  const [transitioning, setTransitioning] = useState(false);

  // login — this is the function FROM AuthContext (renamed to avoid clashing
  // with loginApi, the function that actually calls the server)
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    // stops the browser from doing a full page reload on form submit
    e.preventDefault();

    // set to true
    try {
      setIsSubmitting(true);
      //call the server, get back { token, username }
      const response = await loginApi(formData.username, formData.password);

      // save to context AND localStorage so the session persists
      // login() comes from useAuth() — it's the function in AuthContext
      login(response.token, response.username);

      // CLAUDE CODE — don't navigate yet. LoginTransition takes over the
      // screen and calls navigate("/") itself once its animation finishes
      // (see onDone below) — that's what makes the zoom-then-reveal work.
      setTransitioning(true);
    } catch (err) {
      // catch error
      setError(err.message);
      // CLAUDE CODE — re-trigger the shake/red-highlight animation (see
      // shakeCount's comment above for why this needs to be a counter,
      // not just a boolean)
      setShakeCount((count) => count + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  // CLAUDE CODE — swap the whole page for the animation once login
  // succeeds; LoginTransition calls this back when it's done
  if (transitioning) {
    return <LoginTransition onDone={() => navigate("/")} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img
          src="/persist_logo_trans.png"
          alt="Persist logo"
          className={styles.logoImg}
        />
        <p className={styles.subtitle}>Sign in to continue</p>

        <form
          // see shakeCount's comment above — remounting on every failed
          // attempt is what makes the shake animation replay each time
          key={shakeCount}
          onSubmit={handleSubmit}
          className={`${styles.form} ${error ? styles.formError : ""}`}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={styles.input}
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className={styles.link}>
          <Link to="/register">Don't have an account? Register</Link>
        </div>
      </div>
    </div>
  );
}
