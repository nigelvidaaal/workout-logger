import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  // pull token and loading from auth context
  // useAuth() is our custom hook - reads from AuthContext
  const { token, loading } = useAuth();

  // still checking localStorage — don't make any decisions yet
  // without this, there's a flash where logged-in users see the login page
  // before the useEffect in AuthContext finishes reading localStorage
  if (loading) return <div>Loading...</div>;

  // means not logged in, go back to login page
  // Navigate = react router redirect component
  if (!token) return <Navigate to="/login" />;

  // token exists, user authenticated and rendered now.
  return children;
}
