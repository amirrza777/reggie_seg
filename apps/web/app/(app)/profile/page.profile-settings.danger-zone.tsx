/* eslint-disable max-lines-per-function */
import { Button } from "@/shared/ui/Button";

type ProfileDangerState = {
  role: string;
  isAdmin?: boolean;
  isEnterpriseAdmin?: boolean;
  isUnassigned?: boolean;
};

type DangerZoneSectionProps = {
  profile: ProfileDangerState;
  onOpenLeaveModal: () => void;
  onOpenDeleteModal: () => void;
};

export function DangerZoneSection({
  profile,
  onOpenLeaveModal,
  onOpenDeleteModal,
}: DangerZoneSectionProps) {
  const leaveForbidden =
    profile.role === "ADMIN" ||
    profile.role === "ENTERPRISE_ADMIN" ||
    profile.isAdmin === true ||
    profile.isEnterpriseAdmin === true;

  return (
    <div className="profile-section profile-section--danger">
      <div className="profile-section__header">
        <h3>Danger zone</h3>
        <p>Leave your enterprise or delete your account permanently.</p>
      </div>
      <div className="profile-row">
        <div>
          <div className="profile-row__label">Leave enterprise</div>
          <div className="profile-row__value">
            {profile.isUnassigned
              ? "This account is already not assigned to an enterprise."
              : leaveForbidden
                ? "This responsibility level cannot leave enterprise directly."
                : "Remove this account from the current enterprise workspace."}
          </div>
        </div>
        <Button variant="danger" type="button" onClick={onOpenLeaveModal} disabled={profile.isUnassigned || leaveForbidden}>
          Leave enterprise
        </Button>
      </div>
      <div className="profile-row">
        <div>
          <div className="profile-row__label">Delete account</div>
          <div className="profile-row__value">
            You will go through multiple confirmation steps, including password verification.
          </div>
        </div>
        <Button variant="danger" type="button" onClick={onOpenDeleteModal}>
          Delete account
        </Button>
      </div>
    </div>
  );
}
