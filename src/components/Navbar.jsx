import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import styles from "../styles/Navbar.module.css";

export function Navbar() {
  // pull what we need from auth context
  // user — { username } or null
  // logout — clears token and user from state and localStorage
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // tracks whether the mobile menu is open
  const [isOpen, setIsOpen] = useState(false);

  function handleLogout() {
    // clear the session from context and localStorage
    logout();
    // send user to login page — they're no longer authenticated
    navigate("/login");
    setIsOpen(false);
  }

  // close the menu whenever a link is tapped (so it doesn't stay open after navigating)
  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand} onClick={closeMenu}>
        <img
          src="/persist_logo_trans.png"
          alt="Soar"
          className={styles.logoImg}
        />
      </Link>

      {/* hamburger button — only visible on mobile (CSS handles that) */}
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* links panel — gets an 'open' class when isOpen is true */}
      <div
        className={`${styles.navLinks} ${isOpen ? styles.navLinksOpen : ""}`}
      >
        {user ? (
          <>
            {/* the 4 page links now live in the desktop Sidebar too, so
                pageLinks (CSS) hides this group at the desktop breakpoint —
                kept here (and visible) on mobile, which has no sidebar and
                still needs this as its only way to get between pages */}
            <div className={styles.pageLinks}>
              <NavLink
                to="/"
                end
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.navLink
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/workouts"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.navLink
                }
              >
                Workouts
              </NavLink>
              <NavLink
                to="/muscles"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.navLink
                }
              >
                Muscles
              </NavLink>
              <NavLink
                to="/prs"
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.navLink
                }
              >
                PRs
              </NavLink>
            </div>
            <span className={styles.username}>{user.username}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? styles.active : styles.navLink
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              onClick={closeMenu}
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
