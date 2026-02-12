import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RegisterForm } from "./RegisterForm";
import type { MockedFunction } from "vitest";

const push = vi.fn();
const originalLocation = window.location;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../api/client", () => ({
  signup: vi.fn(),
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
    signupMock.mockReset();
    signupMock.mockResolvedValue(undefined);
    // jsdom allows reassignment
    window.location.href = "http://localhost:3000/";
  });

  it("submits form and redirects", async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "supersecure" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "supersecure" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(signupMock).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "supersecure",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/modules"));
    expect(screen.getByText(/account created/i)).toBeInTheDocument();
  });

  it("starts Google OAuth flow", () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(window.location.href).toContain("/auth/google");
  });
});
