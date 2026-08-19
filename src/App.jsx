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
import { Sidebar } from "./components/Sidebar";
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
      {/* contentRow (index.css) lays Sidebar + main out side by side on
          desktop; Sidebar's own CSS hides it below 641px, so on mobile this
          is just <main> alone, unchanged from before */}
      <div className="contentRow">
        {user && <Sidebar />}
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
      </div>
    </>
  );
}

export default App;
