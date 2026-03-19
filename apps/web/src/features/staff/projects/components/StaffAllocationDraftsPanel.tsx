"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveAllocationDraft,
  getAllocationDrafts,
  getManualAllocationWorkspace,
  updateAllocationDraft,
  type AllocationDraftsWorkspace,
  type ManualAllocationWorkspace,
} from "@/features/projects/api/teamAllocation";
import { STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT } from "./allocationDraftEvents";
import "@/features/staff/projects/styles/staff-projects.css";

type StaffAllocationDraftsPanelProps = {
  projectId: number;
};

type DraftTeam = AllocationDraftsWorkspace["drafts"][number];
type ManualWorkspaceStudent = ManualAllocationWorkspace["students"][number];
const DRAFTS_AUTO_REFRESH_INTERVAL_MS = 15_000;

function toFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

function formatActorRole(role: AllocationDraftsWorkspace["access"]["actorRole"]) {
  if (role === "ENTERPRISE_ADMIN") return "Enterprise admin";
  if (role === "ADMIN") return "Admin";
  return "Staff";
}

function isEditableCandidate(student: ManualWorkspaceStudent, draftTeamId: number) {
  if (student.status === "AVAILABLE") return true;
  return student.currentTeam?.id === draftTeamId;
}

function normalizeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (
    error.message.includes("latest database migration") ||
    error.message.includes("Allocation drafts are unavailable")
  ) {
    return "Allocation drafts are temporarily unavailable. Ask an admin to run the latest API migration.";
  }
  if (
    error.message.includes("updated by another staff member") ||
    error.message.includes("Refresh drafts and try again")
  ) {
    return "This draft changed while you were editing it. Refresh drafts and apply your changes again.";
  }
  return error.message;
}

export function StaffAllocationDraftsPanel({ projectId }: StaffAllocationDraftsPanelProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<AllocationDraftsWorkspace | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingNameTeamId, setEditingNameTeamId] = useState<number | null>(null);
  const [editedTeamName, setEditedTeamName] = useState("");

  const [editingMembersTeamId, setEditingMembersTeamId] = useState<number | null>(null);
  const [memberCandidates, setMemberCandidates] = useState<ManualWorkspaceStudent[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [isLoadingDrafts, startLoadingDraftsTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isLoadingMembers, startLoadingMembersTransition] = useTransition();
  const hasOpenEditor = editingNameTeamId !== null || editingMembersTeamId !== null;

  function resetEditors() {
    setEditingNameTeamId(null);
    setEditedTeamName("");
    setEditingMembersTeamId(null);
    setMemberCandidates([]);
    setSelectedMemberIds([]);
  }

  const loadDrafts = useCallback((options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setErrorMessage("");
    }

    startLoadingDraftsTransition(async () => {
      try {
        const response = await getAllocationDrafts(projectId);
        setWorkspace(response);
      } catch (error) {
        if (!options?.silent) {
          setWorkspace(null);
          setErrorMessage(normalizeMessage(error, "Failed to load allocation drafts."));
        }
      }
    });
  }, [projectId, startLoadingDraftsTransition]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDrafts();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDrafts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleDraftRefresh = () => {
      if (hasOpenEditor || isSaving || isLoadingMembers || isLoadingDrafts) return;
      loadDrafts({ silent: true });
    };
    window.addEventListener(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT, handleDraftRefresh);
    return () => {
      window.removeEventListener(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT, handleDraftRefresh);
    };
  }, [hasOpenEditor, isLoadingDrafts, isLoadingMembers, isSaving, loadDrafts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (hasOpenEditor || isSaving || isLoadingMembers || isLoadingDrafts) return;
      loadDrafts({ silent: true });
    }, DRAFTS_AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasOpenEditor, isLoadingDrafts, isLoadingMembers, isSaving, loadDrafts]);

  const canApprove = workspace?.access.canApproveAllocationDrafts === true;
  const isBusy = isLoadingDrafts || isSaving || isLoadingMembers;

  const editingDraft = useMemo(
    () => workspace?.drafts.find((draft) => draft.id === editingMembersTeamId) ?? null,
    [editingMembersTeamId, workspace?.drafts],
  );

  function startRename(draft: DraftTeam) {
    setEditingNameTeamId(draft.id);
    setEditedTeamName(draft.teamName);
    setNotice(null);
  }

  function cancelRename() {
    setEditingNameTeamId(null);
    setEditedTeamName("");
  }

  function saveRename(teamId: number) {
    const nextName = editedTeamName.trim();
    if (nextName.length === 0) {
      setNotice({ type: "error", text: "Team name cannot be empty." });
      return;
    }
    const currentUpdatedAt = workspace?.drafts.find((draft) => draft.id === teamId)?.updatedAt;
    if (!currentUpdatedAt) {
      setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." });
      return;
    }

    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await updateAllocationDraft(projectId, teamId, {
          teamName: nextName,
          expectedUpdatedAt: currentUpdatedAt,
        });
        setWorkspace((current) => {
          if (!current) return current;
          return {
            ...current,
            drafts: current.drafts.map((draft) =>
              draft.id === teamId
                ? {
                    ...draft,
                    teamName: response.draft.teamName,
                    updatedAt: response.draft.updatedAt,
                  }
                : draft,
            ),
          };
        });
        setNotice({ type: "success", text: `Updated draft team name to "${nextName}".` });
        cancelRename();
        router.refresh();
      } catch (error) {
        setNotice({
          type: "error",
          text: normalizeMessage(error, "Failed to update draft team name."),
        });
      }
    });
  }

  function toggleSelectedMember(studentId: number) {
    setSelectedMemberIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    );
  }

  function startEditMembers(draft: DraftTeam) {
    setNotice(null);
    setEditingNameTeamId(null);
    setEditedTeamName("");

    startLoadingMembersTransition(async () => {
      try {
        const manualWorkspace = await getManualAllocationWorkspace(projectId);
        const candidates = manualWorkspace.students.filter((student) => isEditableCandidate(student, draft.id));
        const candidateIds = new Set(candidates.map((student) => student.id));
        const existingMemberIds = draft.members.map((member) => member.id).filter((id) => candidateIds.has(id));

        setMemberCandidates(candidates);
        setSelectedMemberIds(existingMemberIds);
        setEditingMembersTeamId(draft.id);
      } catch (error) {
        setNotice({
          type: "error",
          text: normalizeMessage(error, "Failed to load students for draft editing."),
        });
      }
    });
  }

  function cancelEditMembers() {
    setEditingMembersTeamId(null);
    setMemberCandidates([]);
    setSelectedMemberIds([]);
  }

  function saveMembers(teamId: number) {
    const currentUpdatedAt = workspace?.drafts.find((draft) => draft.id === teamId)?.updatedAt;
    if (!currentUpdatedAt) {
      setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." });
      return;
    }

    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await updateAllocationDraft(projectId, teamId, {
          studentIds: [...selectedMemberIds].sort((left, right) => left - right),
          expectedUpdatedAt: currentUpdatedAt,
        });
        setWorkspace((current) => {
          if (!current) return current;
          return {
            ...current,
            drafts: current.drafts.map((draft) => (draft.id === teamId ? response.draft : draft)),
          };
        });
        setNotice({
          type: "success",
          text: `Updated members for "${response.draft.teamName}" (${response.draft.memberCount} members).`,
        });
        cancelEditMembers();
        router.refresh();
      } catch (error) {
        setNotice({
          type: "error",
          text: normalizeMessage(error, "Failed to update draft members."),
        });
      }
    });
  }

  function handleApprove(teamId: number) {
    const currentUpdatedAt = workspace?.drafts.find((draft) => draft.id === teamId)?.updatedAt;
    if (!currentUpdatedAt) {
      setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." });
      return;
    }

    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await approveAllocationDraft(projectId, teamId, {
          expectedUpdatedAt: currentUpdatedAt,
        });
        setNotice({
          type: "success",
          text: `Approved "${response.approvedTeam.teamName}" and activated the team.`,
        });
        resetEditors();
        loadDrafts();
        router.refresh();
      } catch (error) {
        setNotice({
          type: "error",
          text: normalizeMessage(error, "Failed to approve draft team."),
        });
      }
    });
  }

  return (
    <section className="staff-projects__team-card staff-projects__allocation-methods" aria-label="Allocation drafts">
      <div className="staff-projects__allocation-mode-head">
        <h2 className="staff-projects__card-title">Allocation Drafts</h2>
        <button
          type="button"
          className="staff-projects__allocation-mode-toggle"
          onClick={() => loadDrafts()}
          disabled={isBusy}
        >
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
                      <input
                        type="text"
                        className="staff-projects__allocation-team-name-input"
                        value={editedTeamName}
                        onChange={(event) => setEditedTeamName(event.target.value)}
                        disabled={isBusy}
                        aria-label={`Draft ${draft.id} team name`}
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
                    <span className="staff-projects__badge">Created by {toFullName(draft.draftCreatedBy)}</span>
                  ) : null}
                </div>

                {!isEditingMembers ? (
                  <ul className="staff-projects__allocation-members">
                    {draft.members.map((member) => (
                      <li key={member.id}>{toFullName(member)}</li>
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
                              <p className="staff-projects__manual-student-name">{toFullName(student)}</p>
                              <p className="staff-projects__manual-student-email">{student.email}</p>
                            </div>
                            <div className="staff-projects__manual-student-side">
                              <span
                                className={
                                  isInThisDraft
                                    ? "staff-projects__manual-status staff-projects__manual-status--assigned"
                                    : "staff-projects__manual-status staff-projects__manual-status--available"
                                }
                              >
                                {isInThisDraft ? "In this draft" : "Available"}
                              </span>
                              <button
                                type="button"
                                className={
                                  isSelected
                                    ? "staff-projects__manual-select-btn staff-projects__manual-select-btn--active"
                                    : "staff-projects__manual-select-btn"
                                }
                                onClick={() => toggleSelectedMember(student.id)}
                                disabled={isBusy}
                                aria-pressed={isSelected}
                              >
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
                      <button
                        type="button"
                        className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                        onClick={() => saveRename(draft.id)}
                        disabled={isBusy}
                      >
                        Save name
                      </button>
                      <button
                        type="button"
                        className="staff-projects__allocation-btn"
                        onClick={cancelRename}
                        disabled={isBusy}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="staff-projects__allocation-btn"
                      onClick={() => startRename(draft)}
                      disabled={isBusy || isEditingMembers}
                    >
                      Rename draft
                    </button>
                  )}

                  {isEditingMembers ? (
                    <>
                      <button
                        type="button"
                        className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                        onClick={() => saveMembers(draft.id)}
                        disabled={isBusy}
                      >
                        Save members
                      </button>
                      <button
                        type="button"
                        className="staff-projects__allocation-btn"
                        onClick={cancelEditMembers}
                        disabled={isBusy}
                      >
                        Cancel member edit
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="staff-projects__allocation-btn"
                      onClick={() => startEditMembers(draft)}
                      disabled={isBusy || isEditingName}
                    >
                      Edit members
                    </button>
                  )}

                  {canApprove ? (
                    <button
                      type="button"
                      className="staff-projects__allocation-btn staff-projects__allocation-btn--light"
                      onClick={() => handleApprove(draft.id)}
                      disabled={isBusy || draft.memberCount < 1 || isEditingName || isEditingMembers}
                    >
                      Approve and activate
                    </button>
                  ) : null}
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

      {workspace && !canApprove ? (
        <p className="staff-projects__allocation-note">
          You can create and edit drafts. Only module owners can approve drafts and activate teams.
        </p>
      ) : null}
    </section>
  );
}