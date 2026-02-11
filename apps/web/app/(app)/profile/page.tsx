'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { AuthField } from "@/features/auth/components/AuthField";
import { confirmEmailChange, requestEmailChange, updateProfile } from "@/features/auth/api/client";
import { useUser } from "@/features/auth/context";

const otpLength = 4;

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [otp, setOtp] = useState<string[]>(Array.from({ length: otpLength }, () => ""));

  const profile = user;

  const avatarSrc = useMemo(() => {
    if (!profile?.avatarBase64 || !profile.avatarMime) return null;
    return `data:${profile.avatarMime};base64,${profile.avatarBase64}`;
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setStatus("loading");
    setMessage(null);
    try {
      const updated = await updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarBase64: profile.avatarBase64 ?? null,
        avatarMime: profile.avatarMime ?? null,
      });
      setUser(updated);
      setStatus("success");
      setMessage("Profile updated.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleAvatarChange = (file: File | null) => {
    if (!profile) return;
    if (!file) {
      setUser({ ...profile, avatarBase64: null, avatarMime: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      setUser({ ...profile, avatarBase64: base64, avatarMime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const requestEmailCode = async () => {
    if (!newEmail) return;
    setStatus("loading");
    setMessage(null);
    try {
      await requestEmailChange(newEmail);
      setEmailStep("confirm");
      setStatus("success");
      setMessage("Verification code sent.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send code");
    }
  };

  const confirmEmail = async () => {
    if (!newEmail) return;
    const code = otp.join("");
    if (code.length !== otpLength) return;
    setStatus("loading");
    setMessage(null);
    try {
      await confirmEmailChange({ newEmail, code });
      setStatus("success");
      setMessage("Email updated. Please log in again.");
      setEmailModalOpen(false);
      setEmailStep("request");
      setOtp(Array.from({ length: otpLength }, () => ""));
      setNewEmail("");
      router.push("/login");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to verify code");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < otpLength - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  };

  if (!profile) return null;

  return (
    <div className="profile-shell">
      <div className="profile-card">
        <div className="profile-card__header">
          <div>
            <p className="profile-card__eyebrow">Account</p>
            <h2 className="profile-card__title">Profile</h2>
          </div>
          <Button className="profile-save" onClick={handleSave} disabled={status === "loading"}>
            {status === "loading" ? "Saving..." : "Save changes"}
          </Button>
        </div>

        {message ? (
          <div className={`profile-alert ${status === "error" ? "profile-alert--error" : "profile-alert--success"}`}>
            {message}
          </div>
        ) : null}

        <div className="profile-section">
          <div className="profile-section__header">
            <h3>Avatar</h3>
            <p>Upload an image to personalize your profile.</p>
          </div>
          <div className="profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" />
            ) : (
              <div className="profile-avatar__fallback">{profile.firstName?.[0] ?? profile.email[0]}</div>
            )}
            <div className="profile-avatar__actions">
              <label className="profile-file">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                />
                Choose file
              </label>
              <Button variant="ghost" type="button" onClick={() => handleAvatarChange(null)}>
                Remove avatar
              </Button>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section__header">
            <h3>Basic info</h3>
            <p>Keep your name up to date.</p>
          </div>
          <div className="profile-grid">
            <AuthField
              name="firstName"
              label="First name"
              value={profile.firstName}
              onChange={(_, val) => setUser({ ...profile, firstName: val })}
              required
            />
            <AuthField
              name="lastName"
              label="Last name"
              value={profile.lastName}
              onChange={(_, val) => setUser({ ...profile, lastName: val })}
              required
            />
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section__header">
            <h3>Security</h3>
            <p>Manage login details and recovery.</p>
          </div>
          <div className="profile-row">
            <div>
              <div className="profile-row__label">Email</div>
              <div className="profile-row__value">{profile.email}</div>
            </div>
            <Button variant="ghost" type="button" onClick={() => setEmailModalOpen(true)}>
              Change email
            </Button>
          </div>
          <div className="profile-row">
            <div>
              <div className="profile-row__label">Password</div>
              <div className="profile-row__value">••••••••</div>
            </div>
            <Button variant="ghost" type="button" onClick={() => router.push("/forgot-password")}>
              Reset password
            </Button>
          </div>
        </div>
      </div>

      {emailModalOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__dialog profile-modal">
            <div className="profile-modal__icon">✉️</div>
            <h3>Verify it’s you</h3>
            <p>
              We sent a verification code. To verify your email address, please check your inbox and enter the code
              below.
            </p>

            {emailStep === "request" ? (
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
                  <Button variant="ghost" type="button" onClick={() => setEmailModalOpen(false)}>
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
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
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
                  <Button variant="ghost" type="button" onClick={() => setEmailModalOpen(false)}>
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
      ) : null}
    </div>
  );
}
