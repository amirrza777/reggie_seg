import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, type MockedFunction } from "vitest";

vi.mock("../api/client", () => ({ resetPassword: vi.fn() }));

import { resetPassword } from "../api/client";
import { ResetPasswordForm } from "./ResetPasswordForm";

const resetMock = resetPassword as MockedFunction<typeof resetPassword>;

beforeEach(() => resetMock.mockReset());

describe("ResetPasswordForm", () => {
  it("shows missing token state", () => {
    render(<ResetPasswordForm token={null} />);
    expect(screen.getByText(/reset link is missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request new link/i })).toBeInTheDocument();
  });

  it("blocks submission when passwords differ", async () => {
    render(<ResetPasswordForm token="abc" />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "superpass" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "superpas1" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("resets password when inputs are valid", async () => {
    resetMock.mockResolvedValue();
    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "superpass" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "superpass" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() => expect(resetMock).toHaveBeenCalledWith({ token: "abc123", newPassword: "superpass" }));
    expect(screen.getByText(/password has been updated/i)).toBeInTheDocument();
  });
});
