"use client";

import "@/features/staff/projects/styles/staff-projects.css";
import { useStaffRandomAllocationPreview, toRandomPreviewFullName } from "./useStaffRandomAllocationPreview";

type StaffRandomAllocationPreviewProps = {
  projectId: number;
  initialTeamCount: number;
  embedded?: boolean;
};

export function StaffRandomAllocationPreview({
  projectId,
  initialTeamCount,
  embedded = false,
}: StaffRandomAllocationPreviewProps) {
  const {
    teamCountInput, minTeamSizeInput, maxTeamSizeInput,
    preview, teamNames, renamingTeams, confirmApply,
    errorMessage, successMessage, isPreviewPending, isApplyPending,
    isPreviewCurrent, getTeamName,
    runPreview, runApplyAllocation, toggleConfirmAllocation,
    onTeamNameChange, onToggleTeamRename,
    onTeamCountChange, onMinTeamSizeChange, onMaxTeamSizeChange,
  } = useStaffRandomAllocationPreview({ projectId, initialTeamCount });

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
          <input type="number" min={1} step={1} value={teamCountInput}
            onChange={(event) => onTeamCountChange(event.target.value)}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Team count"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Minimum students per team (optional)
          <input type="number" min={1} step={1} value={minTeamSizeInput}
            onChange={(event) => onMinTeamSizeChange(event.target.value)}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Minimum students per team"
          />
        </label>
        <label className="staff-projects__allocation-field">
          Maximum students per team (optional)
          <input type="number" min={1} step={1} value={maxTeamSizeInput}
            onChange={(event) => onMaxTeamSizeChange(event.target.value)}
            disabled={confirmApply || isPreviewPending || isApplyPending}
            aria-label="Maximum students per team"
          />
        </label>
      </div>

      <div className="staff-projects__allocation-actions">
        <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runPreview} disabled={confirmApply || isPreviewPending || isApplyPending}>
          {isPreviewPending ? "Generating preview..." : "Preview random teams"}
        </button>
        <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runApplyAllocation} disabled={!isPreviewCurrent || !confirmApply || isPreviewPending || isApplyPending}>
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
            <button type="button"
              className={`staff-projects__allocation-confirm-btn${confirmApply ? " staff-projects__allocation-confirm-btn--active" : ""}`}
              onClick={toggleConfirmAllocation} aria-pressed={confirmApply}
              disabled={!isPreviewCurrent || isPreviewPending || isApplyPending}>
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
                {preview.unassignedStudents.length === 1 ? "" : "s"} could not be assigned with the current team size limits.
              </p>
              <ul className="staff-projects__allocation-members">
                {preview.unassignedStudents.map((student) => (
                  <li key={student.id}>{toRandomPreviewFullName(student)}</li>
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
                        <input type="text" className="staff-projects__allocation-team-name-input"
                          value={teamName}
                          onChange={(event) => onTeamNameChange(team.index, event.target.value)}
                          aria-label={`Team ${teamNumber} name`}
                          disabled={confirmApply || isPreviewPending || isApplyPending}
                        />
                      ) : (
                        <h3 className="staff-projects__team-title">{teamName}</h3>
                      )}
                      <button type="button" className="staff-projects__allocation-rename-btn"
                        onClick={() => onToggleTeamRename(team.index, team.suggestedName, isRenaming)}
                        disabled={confirmApply || !isPreviewCurrent || isPreviewPending || isApplyPending}>
                        {isRenaming ? "Save" : "Rename"}
                      </button>
                    </div>
                    <span className="staff-projects__badge">
                      {team.members.length} member{team.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="staff-projects__allocation-members">
                    {team.members.map((member) => (
                      <li key={member.id}>{toRandomPreviewFullName(member)}</li>
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