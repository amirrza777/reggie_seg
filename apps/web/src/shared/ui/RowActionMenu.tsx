"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type RowActionMenuProps = {
  userId: number;
  userEmail: string;
  busy: boolean;
  active: boolean;
  removeLabel?: string;
  onRemove: (userId: number) => void;
  onReinstate: (userId: number) => void;
};

export function RowActionMenu(props: RowActionMenuProps) {
  const { userId, userEmail, busy, active, removeLabel = "Remove from enterprise", onRemove, onReinstate } = props;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissibleRowMenu({ isOpen, setIsOpen, menuRef });

  return (
    <div ref={menuRef} className="enterprise-management__row-menu">
      <RowMenuTrigger userEmail={userEmail} busy={busy} isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />
      <RowActionMenuPanel
        isOpen={isOpen}
        active={active}
        removeLabel={removeLabel}
        onRemove={() => handleRemoveClick(setIsOpen, onRemove, userId)}
        onReinstate={() => handleReinstateClick(setIsOpen, onReinstate, userId)}
      />
    </div>
  );
}

function useDismissibleRowMenu(params: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  menuRef: RefObject<HTMLDivElement | null>;
}) {
  const { isOpen, setIsOpen, menuRef } = params;
  useEffect(() => {
    if (!isOpen) { return; }
    const handleMouseDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) { setIsOpen(false); }
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setIsOpen(false); } };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, menuRef, setIsOpen]);
}

function RowActionMenuPanel(params: {
  isOpen: boolean;
  active: boolean;
  removeLabel: string;
  onRemove: () => void;
  onReinstate: () => void;
}) {
  const { isOpen, active, removeLabel, onRemove, onReinstate } = params;
  if (!isOpen) { return null; }

  return (
    <div className="enterprise-management__row-menu-panel" role="menu">
      {active ? (
        <button type="button" role="menuitem" className="enterprise-management__row-menu-item enterprise-management__row-menu-item--danger" onClick={onRemove}>{removeLabel}</button>
      ) : (
        <button type="button" role="menuitem" className="enterprise-management__row-menu-item" onClick={onReinstate}>Reinstate</button>
      )}
    </div>
  );
}

function RowMenuTrigger(params: {
  userEmail: string;
  busy: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { userEmail, busy, isOpen, onToggle } = params;
  return (
    <button type="button" className="enterprise-management__row-menu-trigger" aria-label={`Actions for ${userEmail}`} aria-expanded={isOpen} aria-haspopup="menu" disabled={busy} onClick={onToggle}>&bull;&bull;&bull;</button>
  );
}

function handleRemoveClick(setIsOpen: (open: boolean) => void, onRemove: (userId: number) => void, userId: number) {
  setIsOpen(false);
  onRemove(userId);
}

function handleReinstateClick(
  setIsOpen: (open: boolean) => void,
  onReinstate: (userId: number) => void,
  userId: number,
) {
  setIsOpen(false);
  onReinstate(userId);
}
