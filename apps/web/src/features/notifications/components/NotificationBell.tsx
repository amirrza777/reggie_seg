"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getReceivedInvites, acceptInvite, declineInvite, type TeamInvite } from "@/features/projects/api/teamAllocation";
import "@/features/notifications/styles/notification-bell.css";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await getReceivedInvites();
      setInvites(data);
    } catch {
      // silently ignore auth errors etc.
    }
  }, []);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchInvites();
    const id = setInterval(fetchInvites, 30_000);
    return () => clearInterval(id);
  }, [fetchInvites]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAccept = async (invite: TeamInvite) => {
    setActioningId(invite.id);
    try {
      await acceptInvite(invite.id);
      await fetchInvites();
      router.refresh();
    } catch {
      // silently ignore
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (invite: TeamInvite) => {
    setActioningId(invite.id);
    try {
      await declineInvite(invite.id);
      await fetchInvites();
    } catch {
      // silently ignore
    } finally {
      setActioningId(null);
    }
  };

  const count = invites.length;

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        type="button"
        className="notif-bell__btn"
        aria-label={`Notifications${count > 0 ? `, ${count} pending` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {count > 0 && (
          <span className="notif-bell__badge" aria-hidden="true">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-bell__dropdown">
          <div className="notif-bell__dropdown-header">Notification Centre</div>
          {invites.length === 0 ? (
            <div className="notif-bell__empty">You're all caught up</div>
          ) : (
            <ul className="notif-bell__list">
              {invites.map((inv) => {
                const inviterName = inv.inviter
                  ? `${inv.inviter.firstName} ${inv.inviter.lastName}`.trim() || inv.inviter.email
                  : "Someone";
                const teamName = inv.team?.teamName ?? "a team";
                const acting = actioningId === inv.id;

                return (
                  <li key={inv.id} className="notif-bell__item">
                    <p className="notif-bell__item-text">
                      <strong>{inviterName}</strong> invited you to join <strong>{teamName}</strong>
                    </p>
                    <p className="notif-bell__item-meta">{formatRelative(inv.createdAt)}</p>
                    <div className="notif-bell__item-actions">
                      <button
                        type="button"
                        className="notif-bell__accept"
                        onClick={() => handleAccept(inv)}
                        disabled={acting}
                      >
                        {acting ? "…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        className="notif-bell__decline"
                        onClick={() => handleDecline(inv)}
                        disabled={acting}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
