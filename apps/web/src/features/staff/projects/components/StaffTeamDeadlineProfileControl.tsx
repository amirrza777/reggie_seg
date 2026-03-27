"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStaffTeamDeadlineProfile } from "@/features/projects/api/client";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";

type StaffTeamDeadlineProfileControlProps = {
  teamId: number;
  initialProfile: "STANDARD" | "MCF";
};

export function StaffTeamDeadlineProfileControl({
  teamId,
  initialProfile,
}: StaffTeamDeadlineProfileControlProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<"STANDARD" | "MCF">(initialProfile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProfileChange, setPendingProfileChange] = useState<"STANDARD" | "MCF" | null>(null);

  function handleChange(nextProfile: "STANDARD" | "MCF") {
    if (nextProfile === profile || pending) return;
    setPendingProfileChange(nextProfile);
  }

  async function confirmChange() {
    if (!pendingProfileChange || pending) return;

    const nextProfile = pendingProfileChange;
    setPendingProfileChange(null);

    setPending(true);
    setError(null);
    try {
      const updated = await updateStaffTeamDeadlineProfile(teamId, nextProfile);
      setProfile(updated.deadlineProfile);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update deadline profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="staff-projects__profile-switch-wrap">
        <p className="staff-projects__field-label" style={{ margin: 0 }}>
          Deadline profile
        </p>
        <div className="staff-projects__profile-switch" role="group" aria-label="Deadline profile">
          <button
            type="button"
            onClick={() => handleChange("STANDARD")}
            className={`staff-projects__profile-btn${profile === "STANDARD" ? " staff-projects__profile-btn--active" : ""}`}
            disabled={pending}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => handleChange("MCF")}
            className={`staff-projects__profile-btn${profile === "MCF" ? " staff-projects__profile-btn--active" : ""}`}
            disabled={pending}
          >
            MCF
          </button>
        </div>
        {error ? (
          <p className="staff-projects__error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
      <ConfirmationModal
        open={pendingProfileChange !== null}
        title={pendingProfileChange === "MCF" ? "Grant MCF schedule?" : "Revert to standard schedule?"}
        message={
          pendingProfileChange === "MCF"
            ? "Grant this team an MCF? Dates for this team will follow the extended schedule."
            : "Revert this team to standard deadlines? Dates for this team will follow the default schedule."
        }
        cancelLabel="Cancel"
        confirmLabel={pendingProfileChange === "MCF" ? "Grant MCF" : "Revert to standard"}
        onCancel={() => setPendingProfileChange(null)}
        onConfirm={() => void confirmChange()}
      />
    </>
  );
}
