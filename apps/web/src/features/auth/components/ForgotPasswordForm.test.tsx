import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({ requestPasswordReset: vi.fn() }));

import { requestPasswordReset } from "../api/client";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const resetMock = requestPasswordReset as MockedFunction<typeof requestPasswordReset>;

beforeEach(() => resetMock.mockReset());

describe("ForgotPasswordForm", () => {
  it("submits email and shows success message", async () => {
    resetMock.mockResolvedValue();
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith("user@example.com"));
    expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to log in/i })).toBeInTheDocument();
  });

  it("disables submit while sending", async () => {
    resetMock.mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    const submit = screen.getByRole("button", { name: /send reset link/i });
    fireEvent.click(submit);
    expect(submit).toBeDisabled();
    await waitFor(() => expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument());
  });
});
