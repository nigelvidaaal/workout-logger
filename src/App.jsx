import { useState } from "react";
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
import { BottomNav } from "./components/BottomNav";
import { useAuth } from "./context/AuthContext";

function App() {
  // AIHelper's own trigger button used to live inside AIHelper itself; now
  // TWO different buttons can open it — Navbar's icon (desktop) and
  // BottomNav's center icon (mobile) — so the open/closed state has to live
  // up here where all three components can share it.
  const [aiOpen, setAiOpen] = useState(false);
  function toggleAI() {
    setAiOpen((prev) => !prev);
  }

  // every route AIHelper/Sidebar/BottomNav help with is behind
  // ProtectedRoute anyway, so all three only render once someone's logged in
  const { user } = useAuth();

  return (
    <>
      {/* Navbar renders on every page regardless of route */}
      <Navbar aiOpen={aiOpen} onToggleAI={toggleAI} />
      {user && <AIHelper isOpen={aiOpen} onClose={() => setAiOpen(false)} />}
      {user && <BottomNav aiOpen={aiOpen} onToggleAI={toggleAI} />}
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
