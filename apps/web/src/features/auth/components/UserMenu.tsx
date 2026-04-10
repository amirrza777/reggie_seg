'use client';

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../api/client";
import { AUTH_STATE_EVENT } from "../api/session";
import type { UserProfile } from "../types";
import { useUser } from "../useUser";
import { MinimalLoader } from "@/shared/ui/MinimalLoader";

function initials(user: UserProfile) {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const value = `${first}${last}`.trim();
  return value.length > 0 ? value.toUpperCase() : user.email.slice(0, 2).toUpperCase();
}

function resolveAvatarSrc(user: UserProfile): string | null {
  return user.avatarBase64 && user.avatarMime ? `data:${user.avatarMime};base64,${user.avatarBase64}` : null;
}

function resolveDisplayName(user: UserProfile): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function useOutsideMenuClose(menuRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (menuRef.current.contains(event.target as Node)) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuRef, onClose]);
}

function UserMenuAvatar({
  avatarSrc,
  userInitials,
  large = false,
}: {
  avatarSrc: string | null;
  userInitials: string;
  large?: boolean;
}) {
  if (avatarSrc) {
    return <img className={`user-menu__avatar${large ? " user-menu__avatar--large" : ""}`} src={avatarSrc} alt="User avatar" />;
  }
  return (
    <span className={`user-menu__avatar user-menu__avatar--fallback${large ? " user-menu__avatar--large" : ""}`}>
      {userInitials}
    </span>
  );
}

function UserMenuLoading() {
  return (
    <div className="user-menu__trigger" aria-busy="true" aria-label="Loading user menu">
      <span className="user-menu__avatar user-menu__avatar--fallback">…</span>
      <MinimalLoader label="Loading" className="user-menu__loader" />
    </div>
  );
}

function UserMenuAnonymous() {
  return (
    <Link className="user-menu__trigger" href="/login">
      <span className="user-menu__avatar user-menu__avatar--fallback">?</span>
      <span className="user-menu__name">Sign in</span>
    </Link>
  );
}

function SessionTimeoutToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="ui-toast-layer user-menu__session-toast-layer" aria-live="assertive" aria-atomic="true">
      <div className="ui-toast ui-toast--warning user-menu__session-toast" role="alert">
        <p className="user-menu__session-toast-message">
          Your session has timed out or you were signed out. Please log in again.
        </p>
        <div className="user-menu__session-toast-actions">
          <Link className="user-menu__session-toast-link" href="/login">
            Log in
          </Link>
          <button type="button" className="user-menu__session-toast-dismiss" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMenuActionLinks({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <>
      <div className="user-menu__links">
        <Link className="user-menu__link" href="/profile">Profile</Link>
      </div>
      <div className="user-menu__links">
        <Link className="user-menu__link" href="/help">Help</Link>
      </div>
      <div className="user-menu__links">
        <button className="user-menu__link user-menu__link--danger" type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </>
  );
}

function UserMenuDropdown({
  user,
  avatarSrc,
  userInitials,
  displayName,
  onLogout,
}: {
  user: UserProfile;
  avatarSrc: string | null;
  userInitials: string;
  displayName: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="user-menu__dropdown">
      <div className="user-menu__meta">
        <UserMenuAvatar avatarSrc={avatarSrc} userInitials={userInitials} large />
        <div className="user-menu__identity">
          <div className="user-menu__meta-name">{displayName}</div>
          <div className="user-menu__meta-email">{user.email}</div>
        </div>
      </div>
      <UserMenuActionLinks onLogout={onLogout} />
    </div>
  );
}

function UserMenuSignedIn({ user, onLogout }: { user: UserProfile; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useOutsideMenuClose(menuRef, () => setOpen(false));
  const avatarSrc = resolveAvatarSrc(user);
  const displayName = resolveDisplayName(user);
  const userInitials = initials(user);

  return (
    <div className="user-menu" ref={menuRef}>
      <button type="button" className="user-menu__trigger" onClick={() => setOpen((value) => !value)}>
        <UserMenuAvatar avatarSrc={avatarSrc} userInitials={userInitials} />
        <span className="user-menu__name">{displayName}</span>
      </button>
      {open ? (
        <UserMenuDropdown
          user={user}
          avatarSrc={avatarSrc}
          userInitials={userInitials}
          displayName={displayName}
          onLogout={onLogout}
        />
      ) : null}
    </div>
  );
}

export function UserMenu() {
  const { user, setUser, loading } = useUser();
  const router = useRouter();
  const [showSessionTimeoutToast, setShowSessionTimeoutToast] = useState(false);
  const suppressNextSignOutNoticeRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleAuthState = (event: Event) => {
      const authEvent = event as CustomEvent<{ authenticated?: boolean }>;
      if (authEvent.detail?.authenticated !== false || !user) {
        return;
      }
      if (suppressNextSignOutNoticeRef.current) {
        suppressNextSignOutNoticeRef.current = false;
        return;
      }
      setShowSessionTimeoutToast(true);
    };
    window.addEventListener(AUTH_STATE_EVENT, handleAuthState as EventListener);
    return () => window.removeEventListener(AUTH_STATE_EVENT, handleAuthState as EventListener);
  }, [user]);

  useEffect(() => {
    if (user) {
      setShowSessionTimeoutToast(false);
    }
  }, [user]);

  const handleLogout = async () => {
    suppressNextSignOutNoticeRef.current = true;
    setShowSessionTimeoutToast(false);
    await logout();
    setUser(null);
    router.push("/login");
  };

  const menuContent = (() => {
    if (loading) {
      return <UserMenuLoading />;
    }
    if (!user) {
      return <UserMenuAnonymous />;
    }
    return <UserMenuSignedIn user={user} onLogout={handleLogout} />;
  })();

  return (
    <>
      {showSessionTimeoutToast ? <SessionTimeoutToast onClose={() => setShowSessionTimeoutToast(false)} /> : null}
      {menuContent}
    </>
  );
}
