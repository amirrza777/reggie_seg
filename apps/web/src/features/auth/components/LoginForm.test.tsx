import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const originalLocation = window.location;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api/client", () => ({ login: vi.fn() }));
vi.mock("../useUser", () => ({ useUser: () => ({ refresh }) }));

import { login } from "../api/client";
import { LoginForm } from "./LoginForm";

const loginMock = login as MockedFunction<typeof login>;
type LoginResult = Awaited<ReturnType<typeof login>>;

const mockLocation: Pick<Location, "href"> = { href: "http://localhost:3000/" };

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
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
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  window.location.href = "http://localhost:3000/";
});

describe("LoginForm", () => {
  it("submits credentials and redirects non-admin users to dashboard", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as LoginResult);
    refresh.mockResolvedValue({ role: "STUDENT" });
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(loginMock).toHaveBeenCalledWith({ email: "user@example.com", password: "secret" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText(/logged in/i)).not.toBeInTheDocument();
  });

  it("redirects admin users to admin space", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as LoginResult);
    refresh.mockResolvedValue({ role: "ADMIN" });
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });

  it("redirects staff-only users to staff overview", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as LoginResult);
    refresh.mockResolvedValue({ role: "STAFF", isStaff: true });
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff/dashboard"));
  });

  it("redirects enterprise admins to enterprise overview", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as LoginResult);
    refresh.mockResolvedValue({ role: "ENTERPRISE_ADMIN", isEnterpriseAdmin: true });
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/enterprise"));
  });

  it("falls back to app-home when refresh does not return a profile", async () => {
    loginMock.mockResolvedValue({ accessToken: "abc" } as LoginResult);
    refresh.mockResolvedValue(undefined);
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app-home"));
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValue(new Error("bad creds"));
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/bad creds/i)).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("shows fallback error text for non-Error login failures", async () => {
    loginMock.mockRejectedValue("nope");
    render(<LoginForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(screen.getByText("Login failed")).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("starts Google OAuth flow", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(window.location.href).toContain("/auth/google");
  });
});
