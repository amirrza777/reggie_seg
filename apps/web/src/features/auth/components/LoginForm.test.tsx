import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

const push = vi.fn();
const originalLocation = window.location;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api/client", () => ({ login: vi.fn() }));

import { login } from "../api/client";
import { LoginForm } from "./LoginForm";

const loginMock = login as MockedFunction<typeof login>;

const mockLocation: Pick<Location, "href"> = { href: "http://localhost:3000/" };

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/email or username/i), { target: { value: "user@example.com" } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret" } });
};

beforeAll(() => {
  Object.defineProperty(window, "location", { value: mockLocation, writable: true });
});

afterAll(() => {
  Object.defineProperty(window, "location", { value: originalLocation });
});

beforeEach(() => {
  loginMock.mockReset();
  push.mockReset();
  window.location.href = "http://localhost:3000/";
});

describe("LoginForm", () => {
  it("submits credentials and redirects to modules", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as any);
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(loginMock).toHaveBeenCalledWith({ email: "user@example.com", password: "secret" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/modules"));
    expect(screen.getByText(/logged in/i)).toBeInTheDocument();
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValue(new Error("bad creds"));
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/bad creds/i)).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("starts Google OAuth flow", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(window.location.href).toContain("/auth/google");
  });
});
