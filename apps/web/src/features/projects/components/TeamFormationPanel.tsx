"use client";

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
import "@/features/projects/styles/team-formation.css";

type Props = {
  team: Team | null;
  projectId: number;
  userId?: number;
  initialInvites: TeamInvite[];
  projectCompleted?: boolean;
  teamFormationMode?: "self" | "custom" | "staff";
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
  projectCompleted = false,
  teamFormationMode = "self",
}: Props) {
  const router = useRouter();

  // Create team state
  const [teamName, setTeamName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, startCreating] = useTransition();

  // Invite state
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

  // Received invite state
  const [receivedInvites, setReceivedInvites] = useState<TeamInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await acceptInvite(inviteId);
      router.refresh();
    } catch {
      setRespondingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await declineInvite(inviteId);
      setReceivedInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch {
      // Keep current pending invite list if decline fails.
    } finally {
      setRespondingId(null);
    }
  };

  const refreshInvites = useCallback(async (teamId: number) => {
    try {
      const fresh = await getTeamInvites(teamId);
      setInvites(fresh);
    } catch {
      // silently ignore
    }
  }, []);

  const refreshInviteEligibleStudents = useCallback(async (teamId: number) => {
    setIsLoadingInviteEligibleStudents(true);
    try {
      const students = await getTeamInviteEligibleStudents(teamId);
      setInviteEligibleStudents(students);
    } catch {
      setInviteEligibleStudents([]);
    } finally {
      setIsLoadingInviteEligibleStudents(false);
    }
  }, []);

  useEffect(() => {
    if (team || teamFormationMode !== "self") return;
    getReceivedInvites()
      .then((data) => setReceivedInvites(data.filter((inv) => inv.team?.projectId === projectId)))
      .catch(() => {});
  }, [team, projectId, teamFormationMode]);

  useEffect(() => {
    if (!team || projectCompleted) {
      setInviteEligibleStudents([]);
      return;
    }
    void refreshInviteEligibleStudents(team.id);
  }, [team, projectCompleted, refreshInviteEligibleStudents]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (invitePickerRef.current?.contains(target)) return;
      if (inviteDropdownRef.current?.contains(target)) return;
      if (invitePickerRef.current) {
        setIsInviteDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const positionInviteDropdown = useCallback(() => {
    if (!invitePickerRef.current) return;
    const rect = invitePickerRef.current.getBoundingClientRect();
    const top = rect.bottom + 6;
    const viewportBottomGap = 12;
    const maxHeight = Math.max(120, Math.min(240, window.innerHeight - top - viewportBottomGap));
    setInviteDropdownStyle({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!isInviteDropdownOpen) return;
    positionInviteDropdown();
    const handleViewportChange = () => positionInviteDropdown();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isInviteDropdownOpen, positionInviteDropdown]);

  const handleCreateTeam = () => {
    const name = teamName.trim();
    if (!name) return;
    setCreateError("");
    startCreating(async () => {
      try {
        await createTeamForProject(projectId, name);
        router.refresh();
      } catch (err: unknown) {
        setCreateError(getErrorMessage(err, "Failed to create team."));
      }
    });
  };

  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();
  const selectedInvitee = useMemo(
    () =>
      inviteEligibleStudents.find(
        (student) => student.email.trim().toLowerCase() === normalizedInviteEmail,
      ) ?? null,
    [inviteEligibleStudents, normalizedInviteEmail],
  );
  const filteredInviteEligibleStudents = useMemo(() => {
    if (!normalizedInviteEmail) return inviteEligibleStudents;
    return inviteEligibleStudents.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
      const email = student.email.toLowerCase();
      return email.includes(normalizedInviteEmail) || fullName.includes(normalizedInviteEmail);
    });
  }, [inviteEligibleStudents, normalizedInviteEmail]);

  const handleInvite = () => {
    if (!team) return;
    if (!selectedInvitee) {
      setInviteError("Select a student from this module to send an invitation.");
      return;
    }
    const email = selectedInvitee.email.trim().toLowerCase();
    setInviteError("");
    setInviteSuccess("");
    startInviting(async () => {
      try {
        if (typeof userId === "number") {
          await sendTeamInvite(team.id, userId, email);
        } else {
          await sendTeamInvite(team.id, email);
        }
        setInviteEmail("");
        setIsInviteDropdownOpen(false);
        setInviteSuccess(`Invitation sent to ${email}.`);
        await Promise.all([refreshInvites(team.id), refreshInviteEligibleStudents(team.id)]);
      } catch (err: unknown) {
        const message = getErrorMessage(err, "Failed to send invitation.");
        if (message.toLowerCase().includes("pending")) {
          setInviteError("An invite has already been sent to this email.");
        } else {
          setInviteError(message);
        }
      }
    });
  };

  const handleCancel = async (inviteId: string) => {
    if (!team) return;
    setCancellingId(inviteId);
    try {
      await cancelTeamInvite(inviteId);
      await refreshInvites(team.id);
    } catch {
      // silently ignore
    } finally {
      setCancellingId(null);
    }
  };

  // ── No team yet ──
  if (!team) {
    if (teamFormationMode !== "self") {
      return (
        <div className="team-formation">
          <div className="team-formation__empty">
            <span className="team-formation__empty-icon">👥</span>
            <h3>Team allocation is managed by staff</h3>
            <p>
              {teamFormationMode === "custom"
                ? "Complete the allocation questionnaire to be assigned to a team. You'll be notified once your team is created."
                : "Please wait for staff to add you to a team for this project."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="team-formation">
        <div className="team-formation__empty">
          <span className="team-formation__empty-icon">👥</span>
          <h3>You're not in a team yet</h3>
          <p>Create a new team for this project, or accept an invitation from a teammate.</p>
          <div className="team-formation__create-form">
            <input
              type="text"
              placeholder="Team name…"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              maxLength={60}
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCreateTeam}
              disabled={isCreating || !teamName.trim()}
            >
              {isCreating ? "Creating…" : "Create team"}
            </button>
          </div>
          {createError && (
            <p className="team-formation__feedback team-formation__feedback--error">{createError}</p>
          )}
        </div>

        {receivedInvites.length > 0 && (
          <div className="team-formation__section">
            <p className="team-formation__section-title">Pending invitations</p>
            <ul className="team-formation__invite-list">
              {receivedInvites.map((inv) => (
                <li key={inv.id} className="team-formation__invite-item">
                  <span className="team-formation__invite-email">
                    {inv.inviter
                      ? `${inv.inviter.firstName} ${inv.inviter.lastName}`
                      : "A teammate"}{" "}
                    invited you to join <strong>{inv.team?.teamName ?? "a team"}</strong>
                  </span>
                  <div className="team-formation__invite-meta">
                    <span className="team-formation__invite-date">{formatDate(inv.createdAt)}</span>
                    <button
                      type="button"
                      className="btn--accept-ghost"
                      onClick={() => handleAccept(inv.id)}
                      disabled={respondingId === inv.id}
                    >
                      {respondingId === inv.id ? "Accepting…" : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="btn--danger-ghost"
                      onClick={() => handleDecline(inv.id)}
                      disabled={respondingId === inv.id}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const pendingInvites = invites.filter((inv) => inv.status === "PENDING");

  // ── In a team ──
  return (
    <div className="team-formation">
      {/* Current members */}
      <div className="team-formation__section">
        <p className="team-formation__section-title">Members</p>
        <ProjectTeamList team={team} />
      </div>

      {!projectCompleted ? (
        <>
          {/* Invite by email */}
          <div className="team-formation__section">
            <p className="team-formation__section-title">Invite a teammate</p>
            <div className="team-formation__invite-form">
              <div className="team-formation__invite-combobox" ref={invitePickerRef}>
                <input
                  type="text"
                  placeholder="Search module student email"
                  value={inviteEmail}
                  onFocus={() => {
                    setIsInviteDropdownOpen(true);
                    positionInviteDropdown();
                  }}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError("");
                    setInviteSuccess("");
                    setIsInviteDropdownOpen(true);
                    positionInviteDropdown();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInvite();
                    if (e.key === "Escape") setIsInviteDropdownOpen(false);
                  }}
                  autoComplete="off"
                  aria-label="Search module student email"
                />
              </div>
              {isInviteDropdownOpen && inviteDropdownStyle
                ? createPortal(
                    <div
                      ref={inviteDropdownRef}
                      className="team-formation__invite-dropdown team-formation__invite-dropdown--portal"
                      style={{
                        top: `${inviteDropdownStyle.top}px`,
                        left: `${inviteDropdownStyle.left}px`,
                        width: `${inviteDropdownStyle.width}px`,
                        maxHeight: `${inviteDropdownStyle.maxHeight}px`,
                      }}
                      role="listbox"
                      aria-label="Eligible module students"
                    >
                      {isLoadingInviteEligibleStudents ? (
                        <p className="team-formation__invite-empty">Loading students...</p>
                      ) : filteredInviteEligibleStudents.length === 0 ? (
                        <p className="team-formation__invite-empty">No matching module students found.</p>
                      ) : (
                        filteredInviteEligibleStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            className="team-formation__invite-option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setInviteEmail(student.email);
                              setInviteError("");
                              setInviteSuccess("");
                              setIsInviteDropdownOpen(false);
                            }}
                          >
                            <span className="team-formation__invite-option-email">{student.email}</span>
                            <span className="team-formation__invite-option-name">
                              {`${student.firstName} ${student.lastName}`.trim() || `Student #${student.id}`}
                            </span>
                          </button>
                        ))
                      )}
                    </div>,
                    document.body,
                  )
                : null}
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleInvite}
                disabled={isInviting || !selectedInvitee}
              >
                {isInviting ? "Sending…" : "Send invite"}
              </button>
            </div>
            {inviteError && (
              <p className="team-formation__feedback team-formation__feedback--error">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="team-formation__feedback team-formation__feedback--success">{inviteSuccess}</p>
            )}
          </div>

          {/* Pending outgoing invites */}
          {pendingInvites.length > 0 && (
            <div className="team-formation__section">
              <p className="team-formation__section-title">Pending invitations</p>
              <ul className="team-formation__invite-list">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="team-formation__invite-item">
                    <span className="team-formation__invite-email">{inv.inviteeEmail}</span>
                    <div className="team-formation__invite-meta">
                      <span className="team-formation__invite-date">Sent {formatDate(inv.createdAt)}</span>
                      <button
                        type="button"
                        className="btn--danger-ghost"
                        onClick={() => handleCancel(inv.id)}
                        disabled={cancellingId === inv.id}
                      >
                        {cancellingId === inv.id ? "Cancelling…" : "Cancel"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

