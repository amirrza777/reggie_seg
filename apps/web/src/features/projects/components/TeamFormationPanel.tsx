"use client";

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "../types";
import {
  sendTeamInvite,
  cancelTeamInvite,
  getTeamInvites,
  getReceivedInvites,
  acceptInvite,
  declineInvite,
  createTeamForProject,
  type TeamInvite,
  type TeamInviteEligibleStudent,
  getTeamInviteEligibleStudents,
} from "../api/teamAllocation";
import { ProjectTeamList } from "./ProjectTeamList";
import { useProjectWorkspaceCanEdit } from "@/features/projects/workspace/ProjectWorkspaceCanEditContext";
import {
  NoTeamStaffAllocationView,
  NoTeamInviteDeadlinePassedView,
  NoTeamCreateFormView,
  InviteTeammatesSection,
  PendingInvitesSection,
  ReceivedInvitesSection,
} from "./TeamFormationPanel.helpers";
import "@/features/projects/styles/team-formation.css";

type Props = {
  team: Team | null;
  projectId: number;
  userId?: number;
  initialInvites: TeamInvite[];
  teamFormationMode?: "self" | "custom" | "staff";
  questionnaireWindowOpen?: boolean;
  teamAllocationInviteDueDate?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function TeamFormationPanel({
  team,
  projectId,
  userId,
  initialInvites,
  teamFormationMode = "self",
  questionnaireWindowOpen = true,
  teamAllocationInviteDueDate = null,
}: Props) {
  const router = useRouter();
  const { workspaceArchived } = useProjectWorkspaceCanEdit();

  const isQuestionnaireDeadlinePassed = !questionnaireWindowOpen;
  const isInviteDeadlinePassed = teamAllocationInviteDueDate
    ? new Date(teamAllocationInviteDueDate) <= new Date()
    : false;
  const shouldDisableInvites = isQuestionnaireDeadlinePassed || isInviteDeadlinePassed;

  const [teamName, setTeamName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, startCreating] = useTransition();

  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<TeamInvite[]>(initialInvites);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInviting, startInviting] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inviteEligibleStudents, setInviteEligibleStudents] = useState<TeamInviteEligibleStudent[]>([]);
  const [isLoadingInviteEligibleStudents, setIsLoadingInviteEligibleStudents] = useState(false);
  const [isInviteDropdownOpen, setIsInviteDropdownOpen] = useState(false);
  const invitePickerRef = useRef<HTMLDivElement | null>(null);
  const inviteDropdownRef = useRef<HTMLDivElement | null>(null);
  const [inviteDropdownStyle, setInviteDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const [receivedInvites, setReceivedInvites] = useState<TeamInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const refreshReceivedInvites = useCallback(async () => {
    try {
      if (userId) {
        const received = await getReceivedInvites(projectId, userId);
        setReceivedInvites(received);
        setRespondingId(null);
      }
    } catch {
      // Handle error silently
    }
  }, [projectId, userId]);

  const handleAccept = useCallback(async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await acceptInvite(inviteId);
      router.refresh();
    } catch {
      setRespondingId(null);
    }
  }, [router]);

  const handleDecline = useCallback(async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await declineInvite(inviteId);
      await refreshReceivedInvites();
    } catch {
      setRespondingId(null);
    }
  }, [refreshReceivedInvites]);

  const refreshInvites = useCallback(async () => {
    try {
      const teamInvites = await getTeamInvites(projectId);
      setInvites(teamInvites);
    } catch {
      // Handle error silently
    }
  }, [projectId]);

  useEffect(() => {
    refreshReceivedInvites();
  }, [refreshReceivedInvites]);

  const handleCreateTeam = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setCreateError("Team name is required");
      return;
    }
    startCreating(async () => {
      try {
        await createTeamForProject(projectId, teamName.trim());
        router.refresh();
        setTeamName("");
        setCreateError("");
      } catch (error) {
        setCreateError(getErrorMessage(error, "Failed to create team"));
      }
    });
  }, [teamName, projectId, router]);

  const handleLoadInviteEligibleStudents = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoadingInviteEligibleStudents(true);
    try {
      const students = await getTeamInviteEligibleStudents(projectId);
      setInviteEligibleStudents(students);
      setIsInviteDropdownOpen(true);

      if (invitePickerRef.current) {
        const rect = invitePickerRef.current.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        setInviteDropdownStyle({
          top: rect.bottom + scrollTop + 5,
          left: rect.left,
          width: rect.width,
          maxHeight: 300,
        });
      }
    } catch (error) {
      setInviteError(getErrorMessage(error, "Failed to load eligible students"));
    } finally {
      setIsLoadingInviteEligibleStudents(false);
    }
  }, [projectId]);

  const handleSendInvite = useCallback(async (email: string) => {
    if (!email.trim()) {
      setInviteError("Email is required");
      return;
    }
    startInviting(async () => {
      try {
        await sendTeamInvite(projectId, email.trim());
        setInviteEmail("");
        setInviteError("");
        setInviteSuccess(`Invitation sent to ${email}`);
        setTimeout(() => setInviteSuccess(""), 3000);
        await refreshInvites();
        setIsInviteDropdownOpen(false);
      } catch (error) {
        setInviteError(getErrorMessage(error, "Failed to send invitation"));
      }
    });
  }, [projectId, refreshInvites]);

  const handleCancelInvite = useCallback(async (inviteId: string) => {
    setCancellingId(inviteId);
    try {
      await cancelTeamInvite(inviteId);
      await refreshInvites();
      setInviteError("");
      setInviteSuccess("Invitation cancelled");
      setTimeout(() => setInviteSuccess(""), 3000);
    } catch (error) {
      setInviteError(getErrorMessage(error, "Failed to cancel invitation"));
    } finally {
      setCancellingId(null);
    }
  }, [refreshInvites]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inviteDropdownRef.current &&
        !inviteDropdownRef.current.contains(e.target as Node) &&
        invitePickerRef.current &&
        !invitePickerRef.current.contains(e.target as Node)
      ) {
        setIsInviteDropdownOpen(false);
      }
    };
    if (isInviteDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isInviteDropdownOpen]);

  const acceptedInvites = useMemo(
    () => receivedInvites.filter((inv) => inv.status === "accepted"),
    [receivedInvites]
  );

  if (workspaceArchived) {
    return <div className="text-sm text-gray-600">Team formation is not available for archived workspaces.</div>;
  }

  if (team) {
    return <ProjectTeamList team={team} />;
  }

  if (teamFormationMode === "staff") {
    return <NoTeamStaffAllocationView />;
  }

  if (shouldDisableInvites && !acceptedInvites.length) {
    return (
      <NoTeamInviteDeadlinePassedView
        isInviteDeadlinePassed={isInviteDeadlinePassed}
        teamAllocationInviteDueDate={teamAllocationInviteDueDate}
      />
    );
  }

  const pinnedInvite = invites.length > 0 ? invites[0] : null;

  return (
    <div className="space-y-6">
      {acceptedInvites.length > 0 && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            You have accepted {acceptedInvites.length} invitation{acceptedInvites.length !== 1 ? "s" : ""}. Your team will be created once all members confirm.
          </p>
        </div>
      )}

      {!acceptedInvites.length && (
        <NoTeamCreateFormView
          teamName={teamName}
          setTeamName={setTeamName}
          createError={createError}
          isCreating={isCreating}
          onCreateTeam={handleCreateTeam}
        />
      )}

      <div className="space-y-4">
        <InviteTeammatesSection
          pinnedInvite={pinnedInvite}
          shouldDisableInvites={shouldDisableInvites}
          acceptedInvites={acceptedInvites}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          invitePickerRef={invitePickerRef}
          onLoadEligibleStudents={handleLoadInviteEligibleStudents}
          isLoadingInviteEligibleStudents={isLoadingInviteEligibleStudents}
          onSendInvite={handleSendInvite}
          isInviting={isInviting}
          inviteError={inviteError}
          inviteSuccess={inviteSuccess}
          isInviteDropdownOpen={isInviteDropdownOpen}
          inviteDropdownStyle={inviteDropdownStyle}
          inviteDropdownRef={inviteDropdownRef}
          inviteEligibleStudents={inviteEligibleStudents}
        />

        <PendingInvitesSection
          invites={invites}
          onCancelInvite={handleCancelInvite}
          cancellingId={cancellingId}
        />
      </div>

      <ReceivedInvitesSection
        receivedInvites={receivedInvites}
        respondingId={respondingId}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />

      {!acceptedInvites.length && teamAllocationInviteDueDate && (
        <p className="text-xs text-gray-500">
          Team invitations must be accepted by {formatDate(teamAllocationInviteDueDate)}
        </p>
      )}
    </div>
  );
}
