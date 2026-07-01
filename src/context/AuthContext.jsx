import { createContext, useContext, useState, useEffect } from "react";

// createContext() creates the "grid" — the shared space any component can tap into
// null is just the default value before the Provider sets the real value
const AuthContext = createContext(null);

// AuthProvider is a wrapper component that:
// 1. holds the auth state
// 2. provides it to every component inside it
export function AuthProvider({ children }) {
  // user — { username } object or null
  const [user, setUser] = useState(null);

  // token — the JWT string or null
  const [token, setToken] = useState(null);

  // loading — true while we check localStorage on first load
  // starts true so ProtectedRoute doesn't flash the login page before checking
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on app load, check if the user was previously logged in
    // localStorage = authentication; also reason user wouldn't log out every refresh
    const savedToken = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");

    if (savedToken && savedUsername) {
      // restore their session — they're still logged in
      setToken(savedToken);
      setUser({ username: savedUsername });
    }

    // done checking — ProtectedRoute can now make its decision
    setLoading(false);
  }, []);
  // [] means run once on mount — same pattern as fetching data

  // called after successful login or registration
  // stores everything in both state AND localStorage
  function login(newToken, username) {
    // save to localStorage so session survives page refresh
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", username);
    // save to state so React re-renders immediately
    setToken(newToken);
    setUser({ username });
  }

  // called when user clicks logout
  function logout() {
    // clear localStorage — session is gone
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    // clear state — React re-renders immediately, showing logged-out UI
    setToken(null);
    setUser(null);
  }

  return (
    // Provider makes the value available to every component inside it
    // in main.jsx = any component that calls useAuth() gets access to all of this
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// custom hook — makes consuming the context cleaner
// useContext() = React Hook that lets you read and subscribe to context from your component.
export function useAuth() {
  return useContext(AuthContext);
}
