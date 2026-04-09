"use client";

import type { CustomAllocationPreview } from "@/features/projects/api/teamAllocation";
import { formatTeamCriterionSummary, getQualityLabel, toFullName } from "./customisedAllocation.utils";

type Props = {
  teamCountInput: string;
  onTeamCountInputChange: (value: string) => void;
  minTeamSizeInput: string;
  onMinTeamSizeInputChange: (value: string) => void;
  maxTeamSizeInput: string;
  onMaxTeamSizeInputChange: (value: string) => void;
  canPreparePreview: boolean;
  isLoadingCoverage: boolean;
  runPreview: () => void;
  runApplyAllocation: () => void;
  isPreviewCurrent: boolean;
  confirmApply: boolean;
  isPreviewPending: boolean;
  isApplyPending: boolean;
  errorMessage: string;
  successMessage: string;
  preview: CustomAllocationPreview | null;
  unassignedStudents: CustomAllocationPreview["unassignedStudents"];
  teamNames: Record<number, string>;
  renamingTeams: Record<number, boolean>;
  questionLabelById: Map<number, string>;
  getTeamName: (index: number, fallbackName: string) => string;
  toggleConfirmAllocation: () => void;
  onTeamNameChange: (teamIndex: number, value: string) => void;
  onToggleTeamRename: (teamIndex: number, suggestedName: string, isRenaming: boolean) => void;
};

export function StaffCustomisedAllocationPanelStep3({
  teamCountInput, onTeamCountInputChange,
  minTeamSizeInput, onMinTeamSizeInputChange,
  maxTeamSizeInput, onMaxTeamSizeInputChange,
  canPreparePreview, isLoadingCoverage,
  runPreview, runApplyAllocation,
  isPreviewCurrent, confirmApply, isPreviewPending, isApplyPending,
  errorMessage, successMessage,
  preview, unassignedStudents, teamNames, renamingTeams, questionLabelById,
  getTeamName, toggleConfirmAllocation, onTeamNameChange, onToggleTeamRename,
}: Props) {
  return (
    <div className="staff-projects__custom-step">
      <h4 className="staff-projects__custom-step-title">Step 3: Generate Preview</h4>
      <div className="staff-projects__allocation-form">
        <label className="staff-projects__allocation-field">
          Team count
          <input
            type="number" min={1} step={1} value={teamCountInput}
            onChange={(event) => onTeamCountInputChange(event.target.value)}
            aria-label="Customised team count"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
        <label className="staff-projects__allocation-field">
          Minimum students per team (optional)
          <input
            type="number" min={1} step={1} value={minTeamSizeInput}
            onChange={(event) => onMinTeamSizeInputChange(event.target.value)}
            aria-label="Customised minimum students per team"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
        <label className="staff-projects__allocation-field">
          Maximum students per team (optional)
          <input
            type="number" min={1} step={1} value={maxTeamSizeInput}
            onChange={(event) => onMaxTeamSizeInputChange(event.target.value)}
            aria-label="Customised maximum students per team"
            disabled={confirmApply || isPreviewPending || isApplyPending}
          />
        </label>
      </div>
      <div className="staff-projects__allocation-actions">
        <button
          type="button"
          className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
          onClick={runPreview}
          disabled={!canPreparePreview || isLoadingCoverage || confirmApply || isPreviewPending || isApplyPending}
          aria-disabled={!canPreparePreview}
        >
          {isPreviewPending ? "Generating preview..." : "Preview customised teams"}
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
              className={`staff-projects__allocation-confirm-btn${
                confirmApply ? " staff-projects__allocation-confirm-btn--active" : ""
              }`}
              onClick={toggleConfirmAllocation}
              aria-pressed={confirmApply}
              disabled={!isPreviewCurrent || isPreviewPending || isApplyPending}
            >
              {confirmApply ? "Confirmed (click to unlock)" : "Confirm allocation"}
            </button>
            <p className="staff-projects__allocation-confirm-text">
              This saves the exact generated preview as draft teams (including any non-respondent placement strategy).
              {confirmApply ? " Team names and inputs are locked until you unlock confirmation." : ""}
            </p>
          </div>

          <div className="staff-projects__meta">
            <span className="staff-projects__badge">
              {preview.respondentCount} respondent{preview.respondentCount === 1 ? "" : "s"}
            </span>
            <span className="staff-projects__badge">
              {preview.nonRespondentCount} non-respondent{preview.nonRespondentCount === 1 ? "" : "s"}
            </span>
            <span className="staff-projects__badge">{preview.teamCount} planned teams</span>
            <span className="staff-projects__badge">
              Quality: {getQualityLabel(preview.overallScore)} ({Math.round(preview.overallScore * 100)}%)
            </span>
          </div>

          {unassignedStudents.length > 0 ? (
            <div className="staff-projects__manual-workspace-card">
              <p className="staff-projects__allocation-warning">
                {unassignedStudents.length} student
                {unassignedStudents.length === 1 ? "" : "s"} could not be assigned with the current team size limits.
              </p>
              <ul className="staff-projects__allocation-members">
                {unassignedStudents.map((student) => (
                  <li key={student.id} className="staff-projects__custom-member-row">
                    <span>{toFullName(student)}</span>
                    {student.responseStatus === "NO_RESPONSE" ? (
                      <span className="staff-projects__custom-response-badge">No questionnaire response</span>
                    ) : (
                      <span className="staff-projects__badge">Responded</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="staff-projects__allocation-note">
                You can place these students later by editing the saved draft teams.
              </p>
            </div>
          ) : null}

          {preview.criteriaSummary.length > 0 ? (
            <div className="staff-projects__custom-summary-list">
              {preview.criteriaSummary.map((criterion) => (
                <div key={criterion.questionId} className="staff-projects__custom-summary-item">
                  <span className="staff-projects__custom-summary-label">
                    {questionLabelById.get(criterion.questionId) ?? `Question ${criterion.questionId}`}
                  </span>
                  <span className="staff-projects__custom-summary-value">
                    {criterion.strategy} • weight {criterion.weight} •{" "}
                    {Math.round(criterion.satisfactionScore * 100)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <section className="staff-projects__team-list" aria-label="Customised team preview list">
            {preview.previewTeams.map((team, index) => {
              const teamName = getTeamName(team.index, team.suggestedName);
              const isRenaming = renamingTeams[team.index] === true;
              const teamNumber = index + 1;
              const teamCriteriaSummary =
                (preview.teamCriteriaSummary ?? []).find((item) => item.teamIndex === team.index)?.criteria ?? [];

              return (
                <article key={team.index} className="staff-projects__team-card">
                  <div className="staff-projects__team-top">
                    <div className="staff-projects__allocation-team-head">
                      {isRenaming ? (
                        <input
                          type="text"
                          className="staff-projects__allocation-team-name-input"
                          value={teamName}
                          onChange={(event) => onTeamNameChange(team.index, event.target.value)}
                          aria-label={`Custom team ${teamNumber} name`}
                          disabled={confirmApply || isPreviewPending || isApplyPending}
                        />
                      ) : (
                        <h3 className="staff-projects__team-title">{teamName}</h3>
                      )}
                      <button
                        type="button"
                        className="staff-projects__allocation-rename-btn"
                        onClick={() => onToggleTeamRename(team.index, team.suggestedName, isRenaming)}
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
                      <li key={member.id} className="staff-projects__custom-member-row">
                        <span>{toFullName(member)}</span>
                        {member.responseStatus === "NO_RESPONSE" ? (
                          <span className="staff-projects__custom-response-badge">
                            No questionnaire response
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {teamCriteriaSummary.length > 0 ? (
                    <div className="staff-projects__custom-team-breakdown">
                      <p className="staff-projects__custom-team-breakdown-title">Criteria breakdown</p>
                      <ul className="staff-projects__custom-team-breakdown-list">
                        {teamCriteriaSummary.map((criterion) => (
                          <li
                            key={`${team.index}-${criterion.questionId}`}
                            className="staff-projects__custom-team-breakdown-item"
                          >
                            <span className="staff-projects__custom-team-breakdown-label">
                              {questionLabelById.get(criterion.questionId) ?? `Question ${criterion.questionId}`}
                            </span>
                            <span className="staff-projects__custom-team-breakdown-value">
                              {criterion.strategy} • {criterion.weight}w •{" "}
                              {formatTeamCriterionSummary(criterion)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        </div>
      ) : null}
    </div>
  );
}