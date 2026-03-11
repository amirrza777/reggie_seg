"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyRandomAllocation,
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
  const router = useRouter();
  const defaultTeamCount = Math.max(1, initialTeamCount || 2);
  const [teamCountInput, setTeamCountInput] = useState(String(defaultTeamCount));
  const [seedInput, setSeedInput] = useState("");
  const [preview, setPreview] = useState<RandomAllocationPreview | null>(null);
  const [previewInput, setPreviewInput] = useState<{ teamCount: number; seed?: number } | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isApplyPending, startApplyTransition] = useTransition();

  function parseInputs() {
    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) return null;

    const trimmedSeed = seedInput.trim();
    const parsedSeed = trimmedSeed.length > 0 ? Number(trimmedSeed) : undefined;
    if (trimmedSeed.length > 0 && Number.isNaN(parsedSeed)) return null;

    return { parsedTeamCount, parsedSeed };
  }

  function getInputValidationError() {
    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
      return "Team count must be a positive integer.";
    }
    const trimmedSeed = seedInput.trim();
    if (trimmedSeed.length > 0 && Number.isNaN(Number(trimmedSeed))) {
      return "Seed must be a number.";
    }
    return null;
  }

  function isCurrentInputMatchingPreview() {
    if (!preview || !previewInput) {
      return false;
    }
    const parsed = parseInputs();
    if (!parsed) {
      return false;
    }
    return (
      parsed.parsedTeamCount === previewInput.teamCount &&
      (parsed.parsedSeed ?? null) === (previewInput.seed ?? null)
    );
  }

  const isPreviewCurrent = isCurrentInputMatchingPreview();

  function runPreview() {
    const parsed = parseInputs();
    if (!parsed) {
      setErrorMessage(getInputValidationError() ?? "Invalid input values.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    startPreviewTransition(async () => {
      try {
        const result = await getRandomAllocationPreview(projectId, parsed.parsedTeamCount, parsed.parsedSeed);
        setPreview(result);
        setPreviewInput({ teamCount: parsed.parsedTeamCount, ...(parsed.parsedSeed !== undefined ? { seed: parsed.parsedSeed } : {}) });
        setConfirmApply(false);
      } catch (error) {
        setPreview(null);
        setPreviewInput(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to preview random allocation.");
      }
    });
  }

  function runApplyAllocation() {
    const parsed = parseInputs();
    if (!parsed) {
      setErrorMessage(getInputValidationError() ?? "Invalid input values.");
      return;
    }
    if (!isPreviewCurrent) {
      setErrorMessage("Preview is out of date. Generate a fresh preview before applying.");
      return;
    }
    if (!confirmApply) {
      setErrorMessage("Please confirm that this will replace current team assignments.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    startApplyTransition(async () => {
      try {
        const result = await applyRandomAllocation(projectId, parsed.parsedTeamCount, parsed.parsedSeed);
        setSuccessMessage(`Applied random allocation across ${result.appliedTeams.length} team${result.appliedTeams.length === 1 ? "" : "s"}.`);
        setConfirmApply(false);
        setPreview(null);
        setPreviewInput(null);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to apply random allocation.");
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
            onChange={(event) => {
              setTeamCountInput(event.target.value);
              setSuccessMessage("");
              setConfirmApply(false);
            }}
            aria-label="Team count"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Seed (optional)
          <input
            type="number"
            step={1}
            value={seedInput}
            onChange={(event) => {
              setSeedInput(event.target.value);
              setSuccessMessage("");
              setConfirmApply(false);
            }}
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
          disabled={isPreviewPending || isApplyPending}
        >
          {isPreviewPending ? "Generating preview..." : "Preview random teams"}
        </button>
        <button
          type="button"
          className="staff-projects__allocation-btn"
          onClick={runApplyAllocation}
          disabled={!isPreviewCurrent || !confirmApply || isPreviewPending || isApplyPending}
        >
          {isApplyPending ? "Applying..." : "Apply allocation"}
        </button>
      </div>

      <label className="staff-projects__allocation-confirm">
        <input
          type="checkbox"
          checked={confirmApply}
          onChange={(event) => setConfirmApply(event.target.checked)}
          disabled={!isPreviewCurrent || isPreviewPending || isApplyPending}
        />
        <span>This will replace current team assignments for this project.</span>
      </label>

      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}
      {successMessage ? <p className="staff-projects__allocation-success">{successMessage}</p> : null}
      {preview && !isPreviewCurrent ? (
        <p className="staff-projects__allocation-warning">
          Inputs changed since last preview. Generate a new preview before applying.
        </p>
      ) : null}

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