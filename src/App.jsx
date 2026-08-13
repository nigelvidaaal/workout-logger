import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { WorkoutList } from "./pages/WorkoutList";
import { WorkoutDetail } from "./pages/WorkoutDetail";
import { Dashboard } from "./pages/Dashboard";
import { MuscleChart } from "./pages/MuscleChart";
import { Navbar } from "./components/Navbar";
import { PRsPage } from "./pages/PRsPage";
import { AIHelper } from "./components/AIHelper";
import { useAuth } from "./context/AuthContext";

function App() {
  // AIHelper floats globally, but only once someone's actually logged in —
  // every route it would help with is behind ProtectedRoute anyway
  const { user } = useAuth();

  return (
    <>
      {/* Navbar renders on every page regardless of route */}
      <Navbar />
      {user && <AIHelper />}
      <main>
        <Routes>
          {/* public routes — anyone can access these */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* protected routes — redirect to /login if not authenticated */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts"
            element={
              <ProtectedRoute>
                <WorkoutList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts/:id"
            element={
              <ProtectedRoute>
                <WorkoutDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/muscles"
            element={
              <ProtectedRoute>
                <MuscleChart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prs"
            element={
              <ProtectedRoute>
                <PRsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default App;
