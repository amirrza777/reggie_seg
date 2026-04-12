/* eslint-disable max-lines-per-function */
import { Button } from "@/shared/ui/Button";
import { AuthField } from "@/features/auth/components/AuthField";

type ProfileAccount = {
  firstName: string;
  lastName: string;
  email: string;
  enterpriseName?: string | null;
};

type ProfileAccountCardProps = {
  profile: ProfileAccount;
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
  avatarSrc: string | null;
  avatarInitials: string;
  onSave: () => Promise<void>;
  onAvatarChange: (file: File | null) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onOpenEmailModal: () => void;
  onOpenResetPassword: () => void;
};

export function ProfileAccountCard({
  profile,
  status,
  message,
  avatarSrc,
  avatarInitials,
  onSave,
  onAvatarChange,
  onFirstNameChange,
  onLastNameChange,
  onOpenEmailModal,
  onOpenResetPassword,
}: ProfileAccountCardProps) {
  return (
    <>
      <div className="profile-card__header">
        <div>
          <p className="profile-card__eyebrow">Account</p>
          <h2 className="profile-card__title">Profile</h2>
        </div>
        <Button className="profile-save" onClick={onSave} disabled={status === "loading"}>
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
          <div className="profile-avatar__frame">
            {avatarSrc ? (
              <img className="profile-avatar__media" src={avatarSrc} alt="Avatar" />
            ) : (
              <div className="profile-avatar__fallback">{avatarInitials}</div>
            )}
          </div>
          <div className="profile-avatar__actions">
            <label className="profile-file">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
              Choose file
            </label>
            <Button
              variant="ghost"
              className="profile-avatar__remove"
              type="button"
              onClick={() => onAvatarChange(null)}
            >
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
            onChange={(_, val) => onFirstNameChange(val)}
            required
          />
          <AuthField
            name="lastName"
            label="Last name"
            value={profile.lastName}
            onChange={(_, val) => onLastNameChange(val)}
            required
          />
        </div>
        <div className="profile-row">
          <div>
            <div className="profile-row__label">Enterprise</div>
            <div className="profile-row__value">{profile.enterpriseName ?? "Not assigned"}</div>
          </div>
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
          <Button variant="ghost" type="button" onClick={onOpenEmailModal}>
            Change email
          </Button>
        </div>
        <div className="profile-row">
          <div>
            <div className="profile-row__label">Password</div>
            <div className="profile-row__value">••••••••</div>
          </div>
          <Button variant="ghost" type="button" onClick={onOpenResetPassword}>
            Reset password
          </Button>
        </div>
      </div>
    </>
  );
}
