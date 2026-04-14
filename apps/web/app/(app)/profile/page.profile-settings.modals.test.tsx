import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteAccountModal, EmailChangeModal, LeaveEnterpriseModal } from "./page.profile-settings.modals";

vi.mock("@/shared/ui/modal/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-portal">{children}</div>,
}));

vi.mock("@/features/auth/components/AuthField", () => ({
  AuthField: ({ label, value, onChange, type = "text", name }: {
    label: string;
    value: string;
    type?: string;
    name: string;
    onChange: (name: string, value: string) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  ),
}));

describe("profile settings modals", () => {
  it("renders email-change request and confirm states", () => {
    const setOpen = vi.fn();
    const setNewEmail = vi.fn();
    const requestEmailCode = vi.fn(async () => undefined);
    const onOtpChange = vi.fn();
    const onOtpKeyDown = vi.fn();
    const confirmEmail = vi.fn(async () => undefined);

    const { rerender } = render(
      <EmailChangeModal
        open={false}
        setOpen={setOpen}
        step="request"
        newEmail=""
        setNewEmail={setNewEmail}
        requestEmailCode={requestEmailCode}
        status="idle"
        otp={["", "", "", ""]}
        onOtpChange={onOtpChange}
        onOtpKeyDown={onOtpKeyDown}
        confirmEmail={confirmEmail}
      />,
    );
    expect(screen.queryByTestId("modal-portal")).not.toBeInTheDocument();

    rerender(
      <EmailChangeModal
        open
        setOpen={setOpen}
        step="request"
        newEmail=""
        setNewEmail={setNewEmail}
        requestEmailCode={requestEmailCode}
        status="idle"
        otp={["", "", "", ""]}
        onOtpChange={onOtpChange}
        onOtpKeyDown={onOtpKeyDown}
        confirmEmail={confirmEmail}
      />,
    );
    fireEvent.change(screen.getByLabelText("New email"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(setNewEmail).toHaveBeenCalledWith("new@example.com");
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(requestEmailCode).toHaveBeenCalled();

    rerender(
      <EmailChangeModal
        open
        setOpen={setOpen}
        step="confirm"
        newEmail="new@example.com"
        setNewEmail={setNewEmail}
        requestEmailCode={requestEmailCode}
        status="idle"
        otp={["1", "2", "3", "4"]}
        onOtpChange={onOtpChange}
        onOtpKeyDown={onOtpKeyDown}
        confirmEmail={confirmEmail}
      />,
    );
    const otpInputs = screen.getAllByRole("textbox");
    fireEvent.change(otpInputs[0], { target: { value: "9" } });
    fireEvent.keyDown(otpInputs[0], { key: "Backspace" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Didn’t receive an email? Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    expect(onOtpChange).toHaveBeenCalledWith(0, "9");
    expect(onOtpKeyDown).toHaveBeenCalled();
    expect(requestEmailCode).toHaveBeenCalled();
    expect(confirmEmail).toHaveBeenCalled();
  });

  it("renders delete-account modal across warning/confirm/password steps", () => {
    const close = vi.fn();
    const setAcknowledge = vi.fn();
    const setStep = vi.fn();
    const setError = vi.fn();
    const setPhrase = vi.fn();
    const setPassword = vi.fn();
    const onDelete = vi.fn(async () => undefined);

    const { rerender } = render(
      <DeleteAccountModal
        open
        close={close}
        step="warning"
        error={null}
        acknowledge={false}
        setAcknowledge={setAcknowledge}
        setStep={setStep}
        setError={setError}
        busy={false}
        phrase=""
        setPhrase={setPhrase}
        password=""
        setPassword={setPassword}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    rerender(
      <DeleteAccountModal
        open
        close={close}
        step="warning"
        error={null}
        acknowledge={true}
        setAcknowledge={setAcknowledge}
        setStep={setStep}
        setError={setError}
        busy={false}
        phrase=""
        setPhrase={setPhrase}
        password=""
        setPassword={setPassword}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(setError).toHaveBeenCalledWith(null);
    expect(setStep).toHaveBeenCalledWith("confirm");

    rerender(
      <DeleteAccountModal
        open
        close={close}
        step="confirm"
        error="wrong phrase"
        acknowledge={true}
        setAcknowledge={setAcknowledge}
        setStep={setStep}
        setError={setError}
        busy={false}
        phrase="DELETE"
        setPhrase={setPhrase}
        password=""
        setPassword={setPassword}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );
    fireEvent.change(screen.getByLabelText("Type DELETE"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("wrong phrase")).toBeInTheDocument();

    rerender(
      <DeleteAccountModal
        open
        close={close}
        step="password"
        error={null}
        acknowledge={true}
        setAcknowledge={setAcknowledge}
        setStep={setStep}
        setError={setError}
        busy={false}
        phrase="DELETE"
        setPhrase={setPhrase}
        password=""
        setPassword={setPassword}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete account permanently" }));
    expect(setPassword).toHaveBeenCalledWith("secret");
    expect(onDelete).toHaveBeenCalled();
  });

  it("renders leave-enterprise modal state and handlers", () => {
    const close = vi.fn();
    const setPhrase = vi.fn();
    const onLeave = vi.fn(async () => undefined);

    render(
      <LeaveEnterpriseModal
        open
        close={close}
        error="leave failed"
        phrase=""
        setPhrase={setPhrase}
        busy={false}
        onLeave={onLeave}
        confirmPhrase="LEAVE"
      />,
    );

    expect(screen.getByText("leave failed")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type LEAVE"), { target: { value: "LEAVE" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave enterprise" }));
    expect(setPhrase).toHaveBeenCalledWith("LEAVE");
    expect(close).toHaveBeenCalled();
    expect(onLeave).toHaveBeenCalled();
  });

  it("returns null for closed delete/leave modals and supports modal-overlay close actions", () => {
    const close = vi.fn();
    const { rerender } = render(
      <DeleteAccountModal
        open={false}
        close={close}
        step="warning"
        error={null}
        acknowledge={false}
        setAcknowledge={vi.fn()}
        setStep={vi.fn()}
        setError={vi.fn()}
        busy={false}
        phrase=""
        setPhrase={vi.fn()}
        password=""
        setPassword={vi.fn()}
        onDelete={vi.fn(async () => undefined)}
        confirmPhrase="DELETE"
      />,
    );
    expect(screen.queryByTestId("modal-portal")).not.toBeInTheDocument();

    rerender(
      <LeaveEnterpriseModal
        open={false}
        close={close}
        error={null}
        phrase=""
        setPhrase={vi.fn()}
        busy={false}
        onLeave={vi.fn(async () => undefined)}
        confirmPhrase="LEAVE"
      />,
    );
    expect(screen.queryByTestId("modal-portal")).not.toBeInTheDocument();

    rerender(
      <DeleteAccountModal
        open
        close={close}
        step="confirm"
        error={null}
        acknowledge={true}
        setAcknowledge={vi.fn()}
        setStep={vi.fn()}
        setError={vi.fn()}
        busy={false}
        phrase="DELETE"
        setPhrase={vi.fn()}
        password=""
        setPassword={vi.fn()}
        onDelete={vi.fn(async () => undefined)}
        confirmPhrase="DELETE"
      />,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(close).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("renders busy-state button labels and password-step back action", () => {
    const close = vi.fn();
    const setStep = vi.fn();
    const onDelete = vi.fn(async () => undefined);

    const { rerender } = render(
      <DeleteAccountModal
        open
        close={close}
        step="password"
        error={null}
        acknowledge={true}
        setAcknowledge={vi.fn()}
        setStep={setStep}
        setError={vi.fn()}
        busy={true}
        phrase="DELETE"
        setPhrase={vi.fn()}
        password="secret"
        setPassword={vi.fn()}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );

    fireEvent.click(document.querySelector(".modal__dialog") as Element);
    expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();

    rerender(
      <DeleteAccountModal
        open
        close={close}
        step="password"
        error={null}
        acknowledge={true}
        setAcknowledge={vi.fn()}
        setStep={setStep}
        setError={vi.fn()}
        busy={false}
        phrase="DELETE"
        setPhrase={vi.fn()}
        password="secret"
        setPassword={vi.fn()}
        onDelete={onDelete}
        confirmPhrase="DELETE"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(setStep).toHaveBeenCalledWith("confirm");

    rerender(
      <LeaveEnterpriseModal
        open
        close={close}
        error={null}
        phrase="LEAVE"
        setPhrase={vi.fn()}
        busy={true}
        onLeave={vi.fn(async () => undefined)}
        confirmPhrase="LEAVE"
      />,
    );

    expect(screen.queryByText("leave failed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leaving..." })).toBeDisabled();
  });
});
