import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
// renamed import; lets you import something under a different local name.
import { login as loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export function Login() {
  // formData — same controlled input pattern from Task Manager
  const [formData, setFormData] = useState({ username: "", password: "" });
  // error — to show "Invalid credentials" if login fails
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      console.log("log in successful test", response);

      // save to context AND localStorage so the session persists
      // login() comes from useAuth() — it's the function in AuthContext
      login(response.token, response.username);
      navigate("/");
    } catch (err) {
      // catch error
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
          required
        />
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
        />
        {error && <p>{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
      <Link to="/register">Don't have an account? Register</Link>
    </div>
  );
}
