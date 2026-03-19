"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
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
} from "../api/teamAllocation";
import { ProjectTeamList } from "./ProjectTeamList";
import "@/features/projects/styles/team-formation.css";

type Props = {
  team: Team | null;
  projectId: number;
  initialInvites: TeamInvite[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TeamFormationPanel({ team, projectId, initialInvites }: Props) {
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

  // Received invite state
  const [receivedInvites, setReceivedInvites] = useState<TeamInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (team) return;
    getReceivedInvites()
      .then((data) => setReceivedInvites(data.filter((inv) => inv.team?.projectId === projectId)))
      .catch(() => {});
  }, [team, projectId]);

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

  const handleCreateTeam = () => {
    const name = teamName.trim();
    if (!name) return;
    setCreateError("");
    startCreating(async () => {
      try {
        await createTeamForProject(projectId, name);
        router.refresh();
      } catch (err: any) {
        setCreateError(err?.message || "Failed to create team.");
      }
    });
  };

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !team) return;
    setInviteError("");
    setInviteSuccess("");
    startInviting(async () => {
      try {
        await sendTeamInvite(team.id, email);
        setInviteEmail("");
        setInviteSuccess(`Invitation sent to ${email}.`);
        await refreshInvites(team.id);
      } catch (err: any) {
        if (err?.message?.toLowerCase().includes("pending")) {
          setInviteError("An invite has already been sent to this email.");
        } else {
          setInviteError(err?.message || "Failed to send invitation.");
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

      {/* Invite by email */}
      <div className="team-formation__section">
        <p className="team-formation__section-title">Invite a teammate</p>
        <div className="team-formation__invite-form">
          <input
            type="email"
            placeholder="teammate@university.ac.uk"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              setInviteError("");
              setInviteSuccess("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleInvite}
            disabled={isInviting || !inviteEmail.trim()}
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
    </div>
  );
}