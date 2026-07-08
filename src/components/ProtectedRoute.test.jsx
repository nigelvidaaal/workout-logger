import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// mock useAuth with vi.fn() so we can override it per test
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// import the mocked version so we can control its return value per test
import { useAuth } from "../context/AuthContext";

test("redirects to /login when no token", () => {
  // no token — user is not logged in
  useAuth.mockReturnValue({ token: null, loading: false });

  render(
    <MemoryRouter initialEntries={["/workouts"]}>
      <Routes>
        <Route
          path="/workouts"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByText("Login Page")).toBeInTheDocument();
  expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
});

test("renders children when token exists", () => {
  // has token — user IS logged in
  useAuth.mockReturnValue({ token: "fake-token", loading: false });

  render(
    <MemoryRouter initialEntries={["/workouts"]}>
      <Routes>
        <Route
          path="/workouts"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByText("Protected Content")).toBeInTheDocument();
  expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
});
