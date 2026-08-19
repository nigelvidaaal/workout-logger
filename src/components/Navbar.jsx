import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/Navbar.module.css";

// aiOpen/onToggleAI come from App.jsx — this button and AIHelper's panel
// both need to agree on the same open/closed value, so App.jsx owns it and
// hands each component just the slice it needs (see App.jsx for why).
export function Navbar({ aiOpen, onToggleAI }) {
  // user — { username } or null
  // logout — clears token and user from state and localStorage
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    // send user to login page — they're no longer authenticated
    navigate("/login");
  }

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        <div>
          <img
            src="/persist_logo_trans.png"
            alt="Persist logo"
            className={styles.logoImg}
          />
        </div>
        <span className={styles.brandName}>Persist</span>
      </Link>

      {/* the 4 page links used to live here too — they now live in the
          desktop Sidebar and the mobile BottomNav instead, so this bar is
          just branding + account actions on every screen size */}
      {user ? (
        <div className={styles.actions}>
          {/* aiTrigger (CSS) hides this on mobile — the new BottomNav's
              center icon is the AI trigger there instead. Desktop has no
              BottomNav, so this stays the only way to open it there. */}
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.aiTrigger} ${aiOpen ? styles.iconBtnActive : ""}`}
            onClick={onToggleAI}
            aria-label={aiOpen ? "Close AI helper" : "Open AI helper"}
          >
            <div className={styles.aiBg}>
              <img src="/ai_logo_trans.png" alt="" className={styles.aiIcon} />
            </div>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut size={20} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
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
        </div>
      )}
    </nav>
  );
}
