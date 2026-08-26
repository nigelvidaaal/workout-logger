import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";

// mock useAuth — login function and navigate won't actually do anything
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

// mock useNavigate — prevents errors when navigate('/') is called
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

// mock the API — control what the server "returns"
vi.mock("../api/auth", () => ({
  login: vi.fn(),
}));

test("renders username and password inputs", () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

  // getByPlaceholderText finds inputs by their placeholder attribute
  expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument();
});

test("shows error message when login fails", async () => {
  // make the mock API throw an error — simulates wrong credentials
  const { login: loginApi } = await import("../api/auth");
  loginApi.mockRejectedValue(new Error("Invalid credentials"));

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

  // userEvent simulates real user interactions more accurately than fireEvent
  const user = userEvent.setup();

  // type into the inputs
  await user.type(screen.getByPlaceholderText("Username"), "nigel");
  await user.type(screen.getByPlaceholderText("Password"), "wrongpassword");

  // click the submit button
  await user.click(screen.getByRole("button", { name: "Log In" }));

  // error message should now be visible
  expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
});
