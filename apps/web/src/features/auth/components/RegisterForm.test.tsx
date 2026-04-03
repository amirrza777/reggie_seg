import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RegisterForm } from "./RegisterForm";
import type { MockedFunction } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/client", () => ({
  signup: vi.fn(),
}));

vi.mock("../useUser", () => ({
  useUser: () => ({ refresh }),
}));

// Import after mocks so we get the mocked instances
import { signup } from "../api/client";
const signupMock = signup as MockedFunction<typeof signup>;

beforeAll(() => {
  const mockLocation: Pick<Location, "href" | "assign"> = {
    href: "http://localhost:3000/",
    assign: vi.fn((url: string) => {
      mockLocation.href = url;
    }),
  };

  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
  });
});

describe("RegisterForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    refresh.mockResolvedValue(undefined);
    signupMock.mockReset();
    signupMock.mockResolvedValue(undefined);
    // jsdom allows reassignment
    window.location.href = "http://localhost:3000/";
  });

  it("submits form and redirects", async () => {
    refresh.mockResolvedValue({ role: "STUDENT" });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value: "DEFAULT" } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(signupMock).toHaveBeenCalledWith({
        enterpriseCode: "DEFAULT",
        email: "ada@example.com",
        password: "supersecure",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "STUDENT",
      })
    );

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/account created/i)).toBeInTheDocument();
  });

  it("redirects staff accounts to staff overview after signup", async () => {
    refresh.mockResolvedValue({ role: "STAFF", isStaff: true });
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value: "DEFAULT" } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });
    fireEvent.click(screen.getByRole("radio", { name: /staff/i }));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/staff/dashboard"));
  });

  it("starts Google OAuth flow", () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(window.location.href).toContain("/auth/google");
  });

  it("shows validation error and does not call signup when passwords do not match", async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value: "DEFAULT" } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(signupMock).not.toHaveBeenCalled();
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("redirects to app-home when refresh returns no profile", async () => {
    refresh.mockResolvedValue(null);
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value: "DEFAULT" } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/app-home"));
  });

  it("shows default signup error message for non-Error throws", async () => {
    signupMock.mockRejectedValue("nope");
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/enterprise code/i), { target: { value: "DEFAULT" } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Signup failed")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
    });
  });
});
