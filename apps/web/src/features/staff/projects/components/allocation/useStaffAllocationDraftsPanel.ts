import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveAllocationDraft,
  deleteAllocationDraft,
  getAllocationDrafts,
  getManualAllocationWorkspace,
  updateAllocationDraft,
  type AllocationDraftsWorkspace,
  type ManualAllocationWorkspace,
} from "@/features/projects/api/teamAllocation";
import { STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT } from "./allocationDraftEvents";

type DraftTeam = AllocationDraftsWorkspace["drafts"][number];
type ManualWorkspaceStudent = ManualAllocationWorkspace["students"][number];
const DRAFTS_AUTO_REFRESH_INTERVAL_MS = 15_000;

export function toAllocationDraftFullName(member: { firstName: string; lastName: string; email: string }) {
  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return fullName.length > 0 ? fullName : member.email;
}

export function formatActorRole(role: AllocationDraftsWorkspace["access"]["actorRole"]) {
  if (role === "ENTERPRISE_ADMIN") return "Enterprise admin";
  if (role === "ADMIN") return "Admin";
  return "Staff";
}

export function isEditableCandidate(student: ManualWorkspaceStudent, draftTeamId: number) {
  if (student.status === "AVAILABLE") return true;
  return student.currentTeam?.id === draftTeamId;
}

function normalizeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes("latest database migration") || error.message.includes("Allocation drafts are unavailable")) {
    return "Allocation drafts are temporarily unavailable. Ask an admin to run the latest API migration.";
  }
  if (error.message.includes("updated by another staff member") || error.message.includes("Refresh drafts and try again")) {
    return "This draft changed while you were editing it. Refresh drafts and apply your changes again.";
  }
  return error.message;
}

export function useStaffAllocationDraftsPanel({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<AllocationDraftsWorkspace | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingNameTeamId, setEditingNameTeamId] = useState<number | null>(null);
  const [editedTeamName, setEditedTeamName] = useState("");
  const [pendingDeleteDraftId, setPendingDeleteDraftId] = useState<number | null>(null);
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
    if (!options?.silent) setErrorMessage("");
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
    const timer = window.setTimeout(() => { loadDrafts(); }, 0);
    return () => { window.clearTimeout(timer); };
  }, [loadDrafts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleDraftRefresh = () => {
      if (hasOpenEditor || isSaving || isLoadingMembers || isLoadingDrafts) return;
      loadDrafts({ silent: true });
    };
    window.addEventListener(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT, handleDraftRefresh);
    return () => { window.removeEventListener(STAFF_ALLOCATION_DRAFTS_REFRESH_EVENT, handleDraftRefresh); };
  }, [hasOpenEditor, isLoadingDrafts, isLoadingMembers, isSaving, loadDrafts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (hasOpenEditor || isSaving || isLoadingMembers || isLoadingDrafts) return;
      loadDrafts({ silent: true });
    }, DRAFTS_AUTO_REFRESH_INTERVAL_MS);
    return () => { window.clearInterval(timer); };
  }, [hasOpenEditor, isLoadingDrafts, isLoadingMembers, isSaving, loadDrafts]);

  const canApprove = workspace?.access.canApproveAllocationDrafts === true;
  const isBusy = isLoadingDrafts || isSaving || isLoadingMembers;

  const editingDraft = useMemo(
    () => workspace?.drafts.find((draft) => draft.id === editingMembersTeamId) ?? null,
    [editingMembersTeamId, workspace?.drafts],
  );
  const pendingDeleteDraft = useMemo(
    () => workspace?.drafts.find((draft) => draft.id === pendingDeleteDraftId) ?? null,
    [pendingDeleteDraftId, workspace?.drafts],
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
    if (nextName.length === 0) { setNotice({ type: "error", text: "Team name cannot be empty." }); return; }
    const currentUpdatedAt = workspace?.drafts.find((draft) => draft.id === teamId)?.updatedAt;
    if (!currentUpdatedAt) { setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." }); return; }
    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await updateAllocationDraft(projectId, teamId, { teamName: nextName, expectedUpdatedAt: currentUpdatedAt });
        setWorkspace((current) => {
          if (!current) return current;
          return { ...current, drafts: current.drafts.map((draft) => draft.id === teamId ? { ...draft, teamName: response.draft.teamName, updatedAt: response.draft.updatedAt } : draft) };
        });
        setNotice({ type: "success", text: `Updated draft team name to "${nextName}".` });
        cancelRename();
        router.refresh();
      } catch (error) {
        setNotice({ type: "error", text: normalizeMessage(error, "Failed to update draft team name.") });
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
        setNotice({ type: "error", text: normalizeMessage(error, "Failed to load students for draft editing.") });
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
    if (!currentUpdatedAt) { setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." }); return; }
    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await updateAllocationDraft(projectId, teamId, {
          studentIds: [...selectedMemberIds].sort((left, right) => left - right),
          expectedUpdatedAt: currentUpdatedAt,
        });
        setWorkspace((current) => {
          if (!current) return current;
          return { ...current, drafts: current.drafts.map((draft) => (draft.id === teamId ? response.draft : draft)) };
        });
        setNotice({ type: "success", text: `Updated members for "${response.draft.teamName}" (${response.draft.memberCount} members).` });
        cancelEditMembers();
        router.refresh();
      } catch (error) {
        setNotice({ type: "error", text: normalizeMessage(error, "Failed to update draft members.") });
      }
    });
  }

  function handleApprove(teamId: number) {
    const currentUpdatedAt = workspace?.drafts.find((draft) => draft.id === teamId)?.updatedAt;
    if (!currentUpdatedAt) { setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." }); return; }
    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await approveAllocationDraft(projectId, teamId, { expectedUpdatedAt: currentUpdatedAt });
        setNotice({ type: "success", text: `Approved "${response.approvedTeam.teamName}" and activated the team.` });
        resetEditors();
        loadDrafts();
        router.refresh();
      } catch (error) {
        setNotice({ type: "error", text: normalizeMessage(error, "Failed to approve draft team.") });
      }
    });
  }

  function handleDelete(teamId: number) {
    const draft = workspace?.drafts.find((item) => item.id === teamId);
    if (!draft) { setNotice({ type: "error", text: "Draft not found. Refresh drafts and try again." }); return; }
    setPendingDeleteDraftId(draft.id);
  }

  function confirmDelete() {
    const draft = pendingDeleteDraft;
    if (!draft) { setPendingDeleteDraftId(null); return; }
    setPendingDeleteDraftId(null);
    setNotice(null);
    startSavingTransition(async () => {
      try {
        const response = await deleteAllocationDraft(projectId, draft.id, { expectedUpdatedAt: draft.updatedAt });
        setWorkspace((current) => {
          if (!current) return current;
          return { ...current, drafts: current.drafts.filter((item) => item.id !== draft.id) };
        });
        if (editingNameTeamId === draft.id || editingMembersTeamId === draft.id) resetEditors();
        setNotice({ type: "success", text: `Deleted draft "${response.deletedDraft.teamName}".` });
        router.refresh();
      } catch (error) {
        setNotice({ type: "error", text: normalizeMessage(error, "Failed to delete draft team.") });
      }
    });
  }

  return {
    workspace, errorMessage, notice,
    editingNameTeamId, editedTeamName, setEditedTeamName,
    editingMembersTeamId, memberCandidates, selectedMemberIds,
    isLoadingDrafts, isSaving, isLoadingMembers,
    canApprove, isBusy, editingDraft, pendingDeleteDraft,
    loadDrafts, startRename, cancelRename, saveRename,
    toggleSelectedMember, startEditMembers, cancelEditMembers, saveMembers,
    handleApprove, handleDelete, confirmDelete, resetEditors,
    setPendingDeleteDraftId,
  };
}