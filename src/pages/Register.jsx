import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// register as registerApi
import { register as registerApi } from "../api/auth";

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
    <div>
      {/* 4. REGISTER */}
      <h1>Register</h1>
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
          {isSubmitting ? "Registering.." : "Register"}
        </button>
      </form>
      {/* 5.  */}
      <Link to="/login">Already have an account? Login</Link>
    </div>
  );
}
