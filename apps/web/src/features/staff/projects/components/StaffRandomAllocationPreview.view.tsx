"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyRandomAllocation,
  getRandomAllocationPreview,
  type RandomAllocationPreview,
} from "@/features/projects/api/teamAllocation";
import { emitStaffAllocationDraftsRefresh } from "./allocationDraftEvents";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffRandomAllocationPreviewProps = {
  projectId: number;
  initialTeamCount: number;
  embedded?: boolean;
};

function toFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

export function StaffRandomAllocationPreview({
  projectId,
  initialTeamCount,
  embedded = false,
}: StaffRandomAllocationPreviewProps) {
  const router = useRouter();
  const defaultTeamCount = Math.max(1, initialTeamCount || 2);
  const [teamCountInput, setTeamCountInput] = useState(String(defaultTeamCount));
  const [minTeamSizeInput, setMinTeamSizeInput] = useState("");
  const [maxTeamSizeInput, setMaxTeamSizeInput] = useState("");
  const [preview, setPreview] = useState<RandomAllocationPreview | null>(null);
  const [previewInput, setPreviewInput] = useState<{
    teamCount: number;
    minTeamSize?: number;
    maxTeamSize?: number;
  } | null>(null);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [renamingTeams, setRenamingTeams] = useState<Record<number, boolean>>({});
  const [confirmApply, setConfirmApply] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isApplyPending, startApplyTransition] = useTransition();

  function parseOptionalPositiveIntegerInput(rawValue: string) {
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }
    return parsed;
  }

  function parseInputs() {
    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) return null;
    const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
    const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
    if (parsedMinTeamSize === null || parsedMaxTeamSize === null) return null;
    if (
      parsedMinTeamSize !== undefined &&
      parsedMaxTeamSize !== undefined &&
      parsedMinTeamSize > parsedMaxTeamSize
    ) {
      return null;
    }

    return {
      parsedTeamCount,
      parsedMinTeamSize,
      parsedMaxTeamSize,
    };
  }

  function getInputValidationError() {
    const parsedTeamCount = Number(teamCountInput);
    if (!Number.isInteger(parsedTeamCount) || parsedTeamCount < 1) {
      return "Team count must be a positive integer.";
    }
    const parsedMinTeamSize = parseOptionalPositiveIntegerInput(minTeamSizeInput);
    if (parsedMinTeamSize === null) {
      return "Minimum students per team must be a positive integer when provided.";
    }
    const parsedMaxTeamSize = parseOptionalPositiveIntegerInput(maxTeamSizeInput);
    if (parsedMaxTeamSize === null) {
      return "Maximum students per team must be a positive integer when provided.";
    }
    if (
      parsedMinTeamSize !== undefined &&
      parsedMaxTeamSize !== undefined &&
      parsedMinTeamSize > parsedMaxTeamSize
    ) {
      return "Minimum students per team cannot be greater than maximum students per team.";
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
      parsed.parsedMinTeamSize === previewInput.minTeamSize &&
      parsed.parsedMaxTeamSize === previewInput.maxTeamSize
    );
  }

  const isPreviewCurrent = isCurrentInputMatchingPreview();

  function toDefaultTeamNameMap(nextPreview: RandomAllocationPreview) {
    return nextPreview.previewTeams.reduce<Record<number, string>>((names, team) => {
      names[team.index] = team.suggestedName;
      return names;
    }, {});
  }

  function getTeamName(index: number, fallbackName: string) {
    return teamNames[index] ?? fallbackName;
  }

  function getTeamNameValidationError() {
    if (!preview) {
      return "Generate a preview before confirming.";
    }

    const normalizedNames = preview.previewTeams.map((team) =>
      getTeamName(team.index, team.suggestedName).trim(),
    );
    if (normalizedNames.some((name) => name.length === 0)) {
      return "Team names cannot be empty.";
    }

    const uniqueNames = new Set(normalizedNames.map((name) => name.toLowerCase()));
    if (uniqueNames.size !== normalizedNames.length) {
      return "Team names must be unique.";
    }

    return null;
  }

  function getTeamNamesForApply() {
    if (!preview) {
      return [];
    }
    return preview.previewTeams.map((team) => getTeamName(team.index, team.suggestedName).trim());
  }

  function toggleConfirmAllocation() {
    if (confirmApply) {
      setConfirmApply(false);
      return;
    }

    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    setErrorMessage("");
    setConfirmApply(true);
  }

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
        const teamSizeOptions = {
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        };
        const result =
          Object.keys(teamSizeOptions).length > 0
            ? await getRandomAllocationPreview(projectId, parsed.parsedTeamCount, teamSizeOptions)
            : await getRandomAllocationPreview(projectId, parsed.parsedTeamCount);
        setPreview(result);
        setPreviewInput({
          teamCount: parsed.parsedTeamCount,
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        });
        setTeamNames(toDefaultTeamNameMap(result));
        setRenamingTeams({});
        setConfirmApply(false);
      } catch (error) {
        setPreview(null);
        setPreviewInput(null);
        setTeamNames({});
        setRenamingTeams({});
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
      setErrorMessage("Please confirm that this allocation should proceed.");
      return;
    }
    const teamNameValidationError = getTeamNameValidationError();
    if (teamNameValidationError) {
      setErrorMessage(teamNameValidationError);
      return;
    }

    const teamNamesForApply = getTeamNamesForApply();

    setErrorMessage("");
    setSuccessMessage("");
    startApplyTransition(async () => {
      try {
        const teamSizeOptions = {
          ...(parsed.parsedMinTeamSize !== undefined ? { minTeamSize: parsed.parsedMinTeamSize } : {}),
          ...(parsed.parsedMaxTeamSize !== undefined ? { maxTeamSize: parsed.parsedMaxTeamSize } : {}),
        };
        const result =
          Object.keys(teamSizeOptions).length > 0
            ? await applyRandomAllocation(
                projectId,
                parsed.parsedTeamCount,
                teamNamesForApply,
                teamSizeOptions,
              )
            : await applyRandomAllocation(projectId, parsed.parsedTeamCount, teamNamesForApply);
        setSuccessMessage(
          `Saved random allocation as draft across ${result.appliedTeams.length} team${result.appliedTeams.length === 1 ? "" : "s"}.`,
        );
        setConfirmApply(false);
        setPreview(null);
        setPreviewInput(null);
        setTeamNames({});
        setRenamingTeams({});
        emitStaffAllocationDraftsRefresh();
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to apply random allocation.";
        if (message.includes("no longer vacant")) {
          setConfirmApply(false);
          setPreview(null);
          setPreviewInput(null);
          setTeamNames({});
          setRenamingTeams({});
        }
        setErrorMessage(message);
      }
    });
  }

  return (
    <section
      className={
        embedded
          ? "staff-projects__allocation-content staff-projects__allocation-content--embedded"
          : "staff-projects__team-card staff-projects__allocation-content"
      }
      aria-label="Random allocation preview"
    >
      {!embedded ? (
        <>
          <h2 className="staff-projects__card-title">Random allocation preview</h2>
          <p className="staff-projects__card-sub">
            Choose how many teams to generate, preview the random distribution, and review before applying.
          </p>
          <p className="staff-projects__allocation-note">
            Only vacant students are included here. Students already assigned to a team in this project are excluded.
          </p>
        </>
      ) : null}

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
            }}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Team count"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Minimum students per team (optional)
          <input
            type="number"
            min={1}
            step={1}
            value={minTeamSizeInput}
            onChange={(event) => {
              setMinTeamSizeInput(event.target.value);
              setSuccessMessage("");
            }}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Minimum students per team"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Maximum students per team (optional)
          <input
            type="number"
            min={1}
            step={1}
            value={maxTeamSizeInput}
            onChange={(event) => {
              setMaxTeamSizeInput(event.target.value);
              setSuccessMessage("");
            }}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Maximum students per team"
          />
        </label>
      </div>

      <div className="staff-projects__allocation-actions">
        <button
          type="button"
          className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runPreview}
          disabled={confirmApply || isPreviewPending || isApplyPending}
        >
          {isPreviewPending ? "Generating preview..." : "Preview random teams"}
        </button>
        <button
          type="button"
          className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runApplyAllocation}
          disabled={!isPreviewCurrent || !confirmApply || isPreviewPending || isApplyPending}
        >
          {isApplyPending ? "Saving draft..." : "Save draft allocation"}
        </button>
      </div>

      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}
      {successMessage ? <p className="staff-projects__allocation-success">{successMessage}</p> : null}
      {preview && !isPreviewCurrent ? (
        <p className="staff-projects__allocation-warning">
          Inputs changed since last preview. Generate a new preview before applying.
        </p>
      ) : null}

      {preview ? (
        <div className="staff-projects__allocation-results">
          <div className="staff-projects__allocation-confirm">
            <button
              type="button"
              className={`staff-projects__allocation-confirm-btn${confirmApply ? " staff-projects__allocation-confirm-btn--active" : ""}`}
              onClick={toggleConfirmAllocation}
              aria-pressed={confirmApply}
              disabled={!isPreviewCurrent || isPreviewPending || isApplyPending}
            >
              {confirmApply ? "Confirmed (click to unlock)" : "Confirm allocation"}
            </button>
            <p className="staff-projects__allocation-confirm-text">
              This creates draft teams for vacant students only. Existing team memberships in this project stay unchanged.
              {confirmApply ? " Team names and preview settings are locked until you unlock confirmation." : ""}
            </p>
          </div>

          <div className="staff-projects__meta">
            <span className="staff-projects__badge">{preview.studentCount} vacant student{preview.studentCount === 1 ? "" : "s"}</span>
            <span className="staff-projects__badge">{preview.teamCount} planned teams</span>
            <span className="staff-projects__badge">{preview.existingTeams.length} existing teams</span>
          </div>
          {preview.unassignedStudents.length > 0 ? (
            <div className="staff-projects__manual-workspace-card">
              <p className="staff-projects__allocation-warning">
                {preview.unassignedStudents.length} student
                {preview.unassignedStudents.length === 1 ? "" : "s"} could not be assigned with the current
                team size limits.
              </p>
              <ul className="staff-projects__allocation-members">
                {preview.unassignedStudents.map((student) => (
                  <li key={student.id}>{toFullName(student)}</li>
                ))}
              </ul>
              <p className="staff-projects__allocation-note">
                You can place these students later by editing the saved draft teams.
              </p>
            </div>
          ) : null}

          <section className="staff-projects__team-list" aria-label="Random team preview list">
            {preview.previewTeams.map((team, index) => {
              const teamName = getTeamName(team.index, team.suggestedName);
              const isRenaming = renamingTeams[team.index] === true;
              const teamNumber = index + 1;

              return (
                <article key={team.index} className="staff-projects__team-card">
                  <div className="staff-projects__team-top">
                    <div className="staff-projects__allocation-team-head">
                      {isRenaming ? (
                        <input
                          type="text"
                          className="staff-projects__allocation-team-name-input"
                          value={teamName}
                          onChange={(event) => {
                            setTeamNames((currentNames) => ({
                              ...currentNames,
                              [team.index]: event.target.value,
                            }));
                            setErrorMessage("");
                            setSuccessMessage("");
                          }}
                          aria-label={`Team ${teamNumber} name`}
                          disabled={confirmApply || isPreviewPending || isApplyPending}
                        />
                      ) : (
                        <h3 className="staff-projects__team-title">{teamName}</h3>
                      )}
                      <button
                        type="button"
                        className="staff-projects__allocation-rename-btn"
                        onClick={() => {
                          if (isRenaming) {
                            setTeamNames((currentNames) => ({
                              ...currentNames,
                              [team.index]: (currentNames[team.index] ?? team.suggestedName).trim(),
                            }));
                          }
                          setRenamingTeams((currentTeams) => ({
                            ...currentTeams,
                            [team.index]: !isRenaming,
                          }));
                        }}
                        disabled={confirmApply || !isPreviewCurrent || isPreviewPending || isApplyPending}
                      >
                        {isRenaming ? "Save" : "Rename"}
                      </button>
                    </div>
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
              );
            })}
          </section>
        </div>
      ) : null}
    </section>
  );
}