import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/Navbar.module.css";

export function Navbar() {
  // pull what we need from auth context
  // user — { username } or null
  // logout — clears token and user from state and localStorage
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    // clear the session from context and localStorage
    logout();
    // send user to login page — they're no longer authenticated
    navigate("/login");
  }

  return (
    <nav className={styles.navbar}>
      {/* brand — always visible */}
      <Link to="/" className={styles.brand}>
        Workout Logger
      </Link>

      <div className={styles.navLinks}>
        {user ? (
          // LOGGED IN — show app navigation and logout
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? styles.active : styles.navLink
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/workouts"
              className={({ isActive }) =>
                isActive ? styles.active : styles.navLink
              }
            >
              Workouts
            </NavLink>
            {/* show who's logged in */}
            <span className={styles.username}>{user.username}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          // NOT LOGGED IN — show auth links only
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                isActive ? styles.active : styles.navLink
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                isActive ? styles.active : styles.navLink
              }
            >
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
