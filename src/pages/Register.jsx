import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// register as registerApi
import { register as registerApi } from "../api/auth";
import styles from "../styles/Auth.module.css";
// basically the same as Login.jsx, just changed some variable names

export function Register() {
  const [formData, setFormData] = useState({ username: "", password: "" });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // this one
      const response = await registerApi(formData.username, formData.password);

      login(response.token, response.username);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // CLAUDE CODE — Auth.module.css was redesigned for Login's new look
    // (Nigel's mockup); .container/.title don't exist in it anymore, so
    // this got the same .page/.card/.logoImg structure to match —
    // otherwise this page would render unstyled. No behavior changed here,
    // layout/classes only.
    <div className={styles.page}>
      <div className={styles.card}>
        <img
          src="/persist_logo_trans.png"
          alt="Persist logo"
          className={styles.logoImg}
        />
        <p className={styles.subtitle}>Let's Workout!</p>

        <form onSubmit={handleSubmit} className={styles.form}>
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
            {isSubmitting ? "Registering in..." : "Register"}
          </button>
        </form>

        <div className={styles.link}>
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
