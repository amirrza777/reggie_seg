"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStaffTeamDeadlineProfile } from "@/features/projects/api/client";

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

  async function handleChange(nextProfile: "STANDARD" | "MCF") {
    if (nextProfile === profile || pending) return;
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
  );
}
