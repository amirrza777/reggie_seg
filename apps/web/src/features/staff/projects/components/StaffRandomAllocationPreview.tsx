"use client";

import { useState, useTransition } from "react";
import {
  getRandomAllocationPreview,
  type RandomAllocationPreview,
} from "@/features/projects/api/teamAllocation";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffRandomAllocationPreviewProps = {
  projectId: number;
  initialTeamCount: number;
};

function toFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

export function StaffRandomAllocationPreview({
  projectId,
  initialTeamCount,
}: StaffRandomAllocationPreviewProps) {
  const defaultTeamCount = Math.max(1, initialTeamCount || 2);
  const [teamCountInput, setTeamCountInput] = useState(String(defaultTeamCount));
  const [seedInput, setSeedInput] = useState("");
  const [preview, setPreview] = useState<RandomAllocationPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function runPreview() {
    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
      setErrorMessage("Team count must be a positive integer.");
      return;
    }

    const trimmedSeed = seedInput.trim();
    const parsedSeed = trimmedSeed.length > 0 ? Number(trimmedSeed) : undefined;
    if (trimmedSeed.length > 0 && Number.isNaN(parsedSeed)) {
      setErrorMessage("Seed must be a number.");
      return;
    }

    setErrorMessage("");
    startTransition(async () => {
      try {
        const result = await getRandomAllocationPreview(projectId, parsedTeamCount, parsedSeed);
        setPreview(result);
      } catch (error) {
        setPreview(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to preview random allocation.");
      }
    });
  }

  return (
    <section className="staff-projects__team-card" aria-label="Random allocation preview">
      <h2 className="staff-projects__card-title">Random allocation preview</h2>
      <p className="staff-projects__card-sub">
        Choose how many teams to generate, preview the random distribution, and review before applying.
      </p>

      <div className="staff-projects__allocation-form">
        <label className="staff-projects__allocation-field">
          Team count
          <input
            type="number"
            min={1}
            step={1}
            value={teamCountInput}
            onChange={(event) => setTeamCountInput(event.target.value)}
            aria-label="Team count"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Seed (optional)
          <input
            type="number"
            step={1}
            value={seedInput}
            onChange={(event) => setSeedInput(event.target.value)}
            aria-label="Seed"
            placeholder="e.g. 20260311"
          />
        </label>
      </div>

      <div className="staff-projects__allocation-actions">
        <button
          type="button"
          className="staff-projects__allocation-btn"
          onClick={runPreview}
          disabled={isPending}
        >
          {isPending ? "Generating preview..." : "Preview random teams"}
        </button>
      </div>

      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}

      {preview ? (
        <div className="staff-projects__allocation-results">
          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{preview.studentCount} students in module</span>
            <span className="staff-projects__badge">{preview.teamCount} planned teams</span>
            <span className="staff-projects__badge">{preview.existingTeams.length} existing teams</span>
          </div>

          <section className="staff-projects__team-list" aria-label="Random team preview list">
            {preview.previewTeams.map((team) => (
              <article key={team.index} className="staff-projects__team-card">
                <div className="staff-projects__team-top">
                  <h3 className="staff-projects__team-title">{team.suggestedName}</h3>
                  <span className="staff-projects__badge">
                    {team.members.length} member{team.members.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="staff-projects__allocation-members">
                  {team.members.map((member) => (
                    <li key={member.id}>{toFullName(member)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </section>
  );
}