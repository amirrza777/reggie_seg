/* eslint-disable max-lines-per-function */
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { AlertTriangle, MailCheck } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { ModalPortal } from "@/shared/ui/modal/ModalPortal";
import { AuthField } from "@/features/auth/components/AuthField";

type EmailStep = "request" | "confirm";
type DeleteStep = "warning" | "confirm" | "password";

type EmailChangeModalProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  step: EmailStep;
  newEmail: string;
  setNewEmail: Dispatch<SetStateAction<string>>;
  requestEmailCode: () => Promise<void>;
  status: "idle" | "loading" | "success" | "error";
  otp: string[];
  onOtpChange: (index: number, value: string) => void;
  onOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  confirmEmail: () => Promise<void>;
};

export function EmailChangeModal({
  open,
  setOpen,
  step,
  newEmail,
  setNewEmail,
  requestEmailCode,
  status,
  otp,
  onOtpChange,
  onOtpKeyDown,
  confirmEmail,
}: EmailChangeModalProps) {
  if (!open) {
    return null;
  }
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
        <div className="modal__dialog profile-modal" onClick={(event) => event.stopPropagation()}>
          <div className="profile-modal__header">
            <div className="profile-modal__icon" aria-hidden="true">
              <MailCheck size={22} />
            </div>
            <h3>Verify it’s you</h3>
            <p>
              We sent a verification code. To verify your email address, please check your inbox and enter the code
              below.
            </p>
          </div>

          {step === "request" ? (
            <div className="profile-modal__body">
              <AuthField
                name="newEmail"
                label="New email"
                type="email"
                value={newEmail}
                onChange={(_, val) => setNewEmail(val)}
                required
              />
              <div className="profile-modal__actions">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={requestEmailCode} disabled={status === "loading"}>
                  Send code
                </Button>
              </div>
            </div>
          ) : (
            <div className="profile-modal__body">
              <div className="otp-group">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => onOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(idx, e)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="profile-modal__link"
                onClick={() => requestEmailCode()}
              >
                Didn’t receive an email? Try again
              </button>
              <div className="profile-modal__actions">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={confirmEmail} disabled={status === "loading"}>
                  Confirm email
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

type DeleteAccountModalProps = {
  open: boolean;
  close: () => void;
  step: DeleteStep;
  error: string | null;
  acknowledge: boolean;
  setAcknowledge: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<DeleteStep>>;
  setError: Dispatch<SetStateAction<string | null>>;
  busy: boolean;
  phrase: string;
  setPhrase: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  onDelete: () => Promise<void>;
  confirmPhrase: string;
};

export function DeleteAccountModal({
  open,
  close,
  step,
  error,
  acknowledge,
  setAcknowledge,
  setStep,
  setError,
  busy,
  phrase,
  setPhrase,
  password,
  setPassword,
  onDelete,
  confirmPhrase,
}: DeleteAccountModalProps) {
  if (!open) {
    return null;
  }
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" onClick={close}>
        <div className="modal__dialog profile-modal" onClick={(event) => event.stopPropagation()}>
          <div className="profile-modal__header">
            <div className="profile-modal__icon profile-modal__icon--danger" aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
            <h3>Delete account</h3>
            <p>
              This is a permanent action. Complete all steps below to confirm account deletion.
            </p>
            <p className="profile-modal__step">
              Step {step === "warning" ? "1" : step === "confirm" ? "2" : "3"} of 3
            </p>
          </div>

          {error ? (
            <div className="profile-alert profile-alert--error">
              {error}
            </div>
          ) : null}

          {step === "warning" ? (
            <div className="profile-modal__body">
              <ul className="profile-danger-list">
                <li>You will lose access to this account immediately.</li>
                <li>Your profile details and linked account data will be removed.</li>
                <li>You will need a new account if you want to return later.</li>
              </ul>
              <label className="profile-checkbox">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(event) => setAcknowledge(event.target.checked)}
                />
                <span className="profile-checkbox__label">I understand this action is permanent.</span>
              </label>
              <div className="profile-modal__actions">
                <Button variant="ghost" type="button" onClick={close} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("confirm");
                  }}
                  disabled={!acknowledge}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="profile-modal__body">
              <p>
                Type <strong>{confirmPhrase}</strong> to continue.
              </p>
              <AuthField
                name="deletePhrase"
                label={`Type ${confirmPhrase}`}
                value={phrase}
                onChange={(_, val) => setPhrase(val)}
                required
              />
              <div className="profile-modal__actions">
                <Button variant="ghost" type="button" onClick={() => setStep("warning")} disabled={busy}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("password");
                  }}
                  disabled={phrase.trim().toUpperCase() !== confirmPhrase}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          {step === "password" ? (
            <div className="profile-modal__body">
              <AuthField
                name="deletePassword"
                label="Current password"
                type="password"
                value={password}
                onChange={(_, val) => setPassword(val)}
                required
              />
              <div className="profile-modal__actions">
                <Button variant="ghost" type="button" onClick={() => setStep("confirm")} disabled={busy}>
                  Back
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                >
                  {busy ? "Deleting..." : "Delete account permanently"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ModalPortal>
  );
}

type LeaveEnterpriseModalProps = {
  open: boolean;
  close: () => void;
  error: string | null;
  phrase: string;
  setPhrase: Dispatch<SetStateAction<string>>;
  busy: boolean;
  onLeave: () => Promise<void>;
  confirmPhrase: string;
};

export function LeaveEnterpriseModal({
  open,
  close,
  error,
  phrase,
  setPhrase,
  busy,
  onLeave,
  confirmPhrase,
}: LeaveEnterpriseModalProps) {
  if (!open) {
    return null;
  }
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" onClick={close}>
        <div className="modal__dialog profile-modal" onClick={(event) => event.stopPropagation()}>
          <div className="profile-modal__header">
            <div className="profile-modal__icon profile-modal__icon--danger" aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
            <h3>Leave enterprise</h3>
            <p>
              You will lose access to enterprise workspace sections until you rejoin with a valid enterprise code.
            </p>
          </div>

          {error ? <div className="profile-alert profile-alert--error">{error}</div> : null}

          <div className="profile-modal__body">
            <p>
              Type <strong>{confirmPhrase}</strong> to continue.
            </p>
            <AuthField
              name="leavePhrase"
              label={`Type ${confirmPhrase}`}
              value={phrase}
              onChange={(_, val) => setPhrase(val)}
              required
            />
            <div className="profile-modal__actions">
              <Button variant="ghost" type="button" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" type="button" onClick={onLeave} disabled={busy}>
                {busy ? "Leaving..." : "Leave enterprise"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
