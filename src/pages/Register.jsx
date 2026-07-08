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
    <div className={styles.container}>
      <h1 className={styles.title}>Login</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        <input
          className={styles.input}
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Registering in..." : "Login"}
        </button>
      </form>
      <div className={styles.link}>
        <Link to="/register">Don't have an account? Register</Link>
      </div>
    </div>
  );
}
