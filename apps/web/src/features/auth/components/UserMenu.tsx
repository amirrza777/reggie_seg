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
  const { user, setUser } = useUser();
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

  if (!user) return null;

  const avatarSrc = user.avatarBase64 && user.avatarMime
    ? `data:${user.avatarMime};base64,${user.avatarBase64}`
    : null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button type="button" className="user-menu__trigger" onClick={() => setOpen((v) => !v)}>
        {avatarSrc ? (
          <img className="user-menu__avatar" src={avatarSrc} alt="User avatar" />
        ) : (
          <span className="user-menu__avatar user-menu__avatar--fallback">{initials(user)}</span>
        )}
        <span className="user-menu__name">{user.firstName || user.lastName ? `${user.firstName} ${user.lastName}` : user.email}</span>
      </button>

      {open ? (
        <div className="user-menu__dropdown">
          <div className="user-menu__meta">
            <div className="user-menu__meta-name">{user.firstName} {user.lastName}</div>
            <div className="user-menu__meta-email">{user.email}</div>
          </div>
          <div className="user-menu__links">
            <Link className="user-menu__link" href="/profile">Edit profile</Link>
            <button className="user-menu__link user-menu__link--danger" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
