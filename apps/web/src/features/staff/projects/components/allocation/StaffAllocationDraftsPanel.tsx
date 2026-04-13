"use client";

import { ConfirmationModal } from "@/shared/ui/modal/ConfirmationModal";
import "@/features/staff/projects/styles/staff-projects.css";
import { useStaffAllocationDraftsPanel, toAllocationDraftFullName, formatActorRole } from "./useStaffAllocationDraftsPanel";

type StaffAllocationDraftsPanelProps = {
  projectId: number;
};

export function StaffAllocationDraftsPanel({ projectId }: StaffAllocationDraftsPanelProps) {
  const {
    workspace, errorMessage, notice,
    editingNameTeamId, editedTeamName, setEditedTeamName,
    editingMembersTeamId, memberCandidates, selectedMemberIds,
    isLoadingDrafts, isSaving,
    canApprove, isBusy, editingDraft, pendingDeleteDraft,
    loadDrafts, startRename, cancelRename, saveRename,
    toggleSelectedMember, startEditMembers, cancelEditMembers, saveMembers,
    handleApprove, handleDelete, confirmDelete,
    setPendingDeleteDraftId,
  } = useStaffAllocationDraftsPanel({ projectId });

  return (
    <section className="staff-projects__team-card staff-projects__allocation-methods" aria-label="Allocation drafts">
      <div className="staff-projects__allocation-mode-head">
        <h2 className="staff-projects__card-title">Allocation Drafts</h2>
        <button type="button" className="staff-projects__allocation-mode-toggle"
          onClick={() => loadDrafts()} disabled={isBusy}>
          {isLoadingDrafts ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {workspace ? (
        <div className="staff-projects__meta">
          <span className="staff-projects__badge">
            {workspace.drafts.length} draft{workspace.drafts.length === 1 ? "" : "s"}
          </span>
          <span className="staff-projects__badge">Role: {formatActorRole(workspace.access.actorRole)}</span>
          <span className="staff-projects__badge">
            {canApprove ? "Can approve drafts" : "Approval requires module owner"}
          </span>
        </div>
      ) : null}

      {errorMessage ? <p className="staff-projects__allocation-error">{errorMessage}</p> : null}
      {notice ? (
        <p className={notice.type === "success" ? "staff-projects__allocation-success" : "staff-projects__allocation-error"}>
          {notice.text}
        </p>
      ) : null}

      {!isLoadingDrafts && workspace && workspace.drafts.length === 0 ? (
        <p className="staff-projects__allocation-note">No allocation drafts yet.</p>
      ) : null}

      {workspace && workspace.drafts.length > 0 ? (
        <section className="staff-projects__team-list" aria-label="Allocation draft list">
          {workspace.drafts.map((draft) => {
            const isEditingName = editingNameTeamId === draft.id;
            const isEditingMembers = editingMembersTeamId === draft.id;
            return (
              <article key={draft.id} className="staff-projects__team-card">
                <div className="staff-projects__team-top">
                  <div className="staff-projects__allocation-team-head">
                    {isEditingName ? (
                      <input type="text" className="staff-projects__allocation-team-name-input"
                        value={editedTeamName} onChange={(event) => setEditedTeamName(event.target.value)}
                        disabled={isBusy} aria-label={`Draft ${draft.id} team name`}
                      />
                    ) : (
                      <h3 className="staff-projects__team-title">{draft.teamName}</h3>
                    )}
                  </div>
                  <span className="staff-projects__badge">
                    {draft.memberCount} member{draft.memberCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="staff-projects__meta">
                  <span className="staff-projects__badge">Draft</span>
                  {draft.draftCreatedBy ? (
                    <span className="staff-projects__badge">Created by {toAllocationDraftFullName(draft.draftCreatedBy)}</span>
                  ) : null}
                </div>

                {!isEditingMembers ? (
                  <ul className="staff-projects__allocation-members">
                    {draft.members.map((member) => (
                      <li key={member.id}>{toAllocationDraftFullName(member)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="staff-projects__manual-student-list" role="list" aria-label={`Edit members for ${draft.teamName}`}>
                    {memberCandidates.length === 0 ? (
                      <p className="staff-projects__allocation-note">No editable students found for this draft.</p>
                    ) : (
                      memberCandidates.map((student) => {
                        const isSelected = selectedMemberIds.includes(student.id);
                        const isInThisDraft = student.currentTeam?.id === draft.id;
                        return (
                          <article key={student.id} className="staff-projects__manual-student-row" role="listitem">
                            <div className="staff-projects__manual-student-main">
                              <p className="staff-projects__manual-student-name">{toAllocationDraftFullName(student)}</p>
                              <p className="staff-projects__manual-student-email">{student.email}</p>
                            </div>
                            <div className="staff-projects__manual-student-side">
                              <span className={isInThisDraft
                                ? "staff-projects__manual-status staff-projects__manual-status--assigned"
                                : "staff-projects__manual-status staff-projects__manual-status--available"}>
                                {isInThisDraft ? "In this draft" : "Available"}
                              </span>
                              <button type="button"
                                className={isSelected
                                  ? "staff-projects__manual-select-btn staff-projects__manual-select-btn--active"
                                  : "staff-projects__manual-select-btn"}
                                onClick={() => toggleSelectedMember(student.id)}
                                disabled={isBusy} aria-pressed={isSelected}>
                                {isSelected ? "Selected" : "Select"}
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                )}

                <div className="staff-projects__allocation-actions">
                  {isEditingName ? (
                    <>
                      <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                        onClick={() => saveRename(draft.id)} disabled={isBusy}>Save name</button>
                      <button type="button" className="staff-projects__allocation-btn"
                        onClick={cancelRename} disabled={isBusy}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="staff-projects__allocation-btn"
                      onClick={() => startRename(draft)} disabled={isBusy || isEditingMembers}>Rename draft</button>
                  )}

                  {isEditingMembers ? (
                    <>
                      <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                        onClick={() => saveMembers(draft.id)} disabled={isBusy}>Save members</button>
                      <button type="button" className="staff-projects__allocation-btn"
                        onClick={cancelEditMembers} disabled={isBusy}>Cancel member edit</button>
                    </>
                  ) : (
                    <button type="button" className="staff-projects__allocation-btn"
                      onClick={() => startEditMembers(draft)} disabled={isBusy || isEditingName}>Edit members</button>
                  )}

                  {canApprove ? (
                    <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                      onClick={() => handleApprove(draft.id)}
                      disabled={isBusy || draft.memberCount < 1 || isEditingName || isEditingMembers}>
                      Approve and activate
                    </button>
                  ) : null}

                  <button type="button" className="staff-projects__allocation-btn staff-projects__allocation-btn--danger"
                    onClick={() => handleDelete(draft.id)} disabled={isBusy || isEditingName || isEditingMembers}>
                    Delete draft
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {editingDraft ? (
        <p className="staff-projects__allocation-note">
          Editing members for "{editingDraft.teamName}". You can select available students and members already in this draft.
        </p>
      ) : null}

      <ConfirmationModal
        open={pendingDeleteDraft !== null}
        title="Delete allocation draft?"
        message={pendingDeleteDraft ? `Delete draft "${pendingDeleteDraft.teamName}"? This will remove it from Allocation Drafts.` : ""}
        cancelLabel="Cancel"
        confirmLabel={isSaving ? "Deleting..." : "Delete draft"}
        confirmVariant="danger"
        busy={isSaving}
        onCancel={() => setPendingDeleteDraftId(null)}
        onConfirm={() => confirmDelete()}
      />

      {workspace && !canApprove ? (
        <p className="staff-projects__allocation-note">
          You can create and edit drafts. Only module owners can approve drafts and activate teams.
          You can delete only drafts that you created.
        </p>
      ) : null}
    </section>
  );
}