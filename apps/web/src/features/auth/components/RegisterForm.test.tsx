import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { RegisterForm } from "./RegisterForm";

vi.useFakeTimers();

describe("RegisterForm", () => {
  it("submits and shows loading state", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "supersecure" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      screen.getByRole("button", { name: /creating account/i })
    ).toBeDisabled();

    vi.runAllTimers();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Registering:",
        expect.objectContaining({
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "supersecure",
        })
      );
    });

    consoleSpy.mockRestore();
  });

  it("supports Google register action", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(<RegisterForm />);

    fireEvent.click(screen.getByRole("button", { name: /sign up with google/i }));

    expect(consoleSpy).toHaveBeenCalledWith("Google Register Clicked");

    consoleSpy.mockRestore();
  });
});
