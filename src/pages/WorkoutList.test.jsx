import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkoutList } from "./WorkoutList";

// mock auth context — provide a fake token
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ token: "fake-token" }),
}));

// mock the API — return controlled workout data
vi.mock("../api/workouts", () => ({
  getWorkouts: vi.fn().mockResolvedValue([
    { id: 1, name: "Push Day", date: "2026-06-15" },
    { id: 2, name: "Leg Day", date: "2026-06-16" },
  ]),
  createWorkout: vi.fn(),
  deleteWorkout: vi.fn(),
}));

test("renders workouts from API", async () => {
  render(
    <MemoryRouter>
      <WorkoutList />
    </MemoryRouter>,
  );

  // findByText is async — waits for the component to finish fetching and re-rendering
  // getByText would fail because the data isn't there on the first render
  expect(await screen.findByText("Push Day")).toBeInTheDocument();
  expect(await screen.findByText("Leg Day")).toBeInTheDocument();
});

test("shows empty message when no workouts", async () => {
  // override the mock for this test — empty array
  const { getWorkouts } = await import("../api/workouts");
  getWorkouts.mockResolvedValue([]);

  render(
    <MemoryRouter>
      <WorkoutList />
    </MemoryRouter>,
  );

  expect(
    await screen.findByText("No workouts yet. Add one above."),
  ).toBeInTheDocument();
});
