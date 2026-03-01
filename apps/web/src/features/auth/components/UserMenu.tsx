'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../api/client";
import type { UserProfile } from "../types";
import { useUser } from "../context";

function initials(user: UserProfile) {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const value = `${first}${last}`.trim();
  return value.length > 0 ? value.toUpperCase() : user.email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user, setUser, loading } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="user-menu__trigger" aria-busy="true" aria-label="Loading user menu">
        <span className="user-menu__avatar user-menu__avatar--fallback">…</span>
        <span className="user-menu__name">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Link className="user-menu__trigger" href="/login">
        <span className="user-menu__avatar user-menu__avatar--fallback">?</span>
        <span className="user-menu__name">Sign in</span>
      </Link>
    );
  }

  const avatarSrc = user.avatarBase64 && user.avatarMime
    ? `data:${user.avatarMime};base64,${user.avatarBase64}`
    : null;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
  const userInitials = initials(user);

  return (
    <div className="user-menu" ref={menuRef}>
      <button type="button" className="user-menu__trigger" onClick={() => setOpen((v) => !v)}>
        {avatarSrc ? (
          <img className="user-menu__avatar" src={avatarSrc} alt="User avatar" />
        ) : (
          <span className="user-menu__avatar user-menu__avatar--fallback">{userInitials}</span>
        )}
        <span className="user-menu__name">{displayName}</span>
      </button>

      {open ? (
        <div className="user-menu__dropdown">
          <div className="user-menu__meta">
            {avatarSrc ? (
              <img className="user-menu__avatar user-menu__avatar--large" src={avatarSrc} alt="User avatar" />
            ) : (
              <span className="user-menu__avatar user-menu__avatar--fallback user-menu__avatar--large">
                {userInitials}
              </span>
            )}
            <div className="user-menu__identity">
              <div className="user-menu__meta-name">{displayName}</div>
              <div className="user-menu__meta-email">{user.email}</div>
            </div>
          </div>
          <div className="user-menu__links">
            <Link className="user-menu__link" href="/profile">Profile</Link>
          </div>
          <div className="user-menu__links">
            <a className="user-menu__link" href="mailto:support@teamfeedback.app">Contact support</a>
          </div>
          <div className="user-menu__links">
            <button className="user-menu__link user-menu__link--danger" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
