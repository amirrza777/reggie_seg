import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RegisterForm } from "./RegisterForm";
import { PENDING_SIGNUP_STORAGE_KEY } from "../pendingSignup";

const push = vi.fn();
const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    // jsdom allows reassignment
    window.location.href = "http://localhost:3000/";
    window.sessionStorage.clear();
  });

  it("stores signup payload and redirects to enterprise code bridge", async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/google/enterprise-code?mode=signup"));
    expect(screen.getByText(/continue with your enterprise code/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY)).toBe(
      JSON.stringify({
        email: "ada@example.com",
        password: "supersecure",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    );
  });

  it("does not render the developer role picker", () => {
    render(<RegisterForm />);
    expect(screen.queryByText(/developer shortcut/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /select role/i })).not.toBeInTheDocument();
  });

  it("starts Google OAuth flow", () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(window.location.href).toContain("/auth/google");
  });

  it("shows validation error and does not call signup when passwords do not match", async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY)).toBeNull();
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});