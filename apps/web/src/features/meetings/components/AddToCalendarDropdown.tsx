"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CalendarPlus } from "lucide-react";
import {
  buildGoogleUrl,
  buildOutlookUrl,
  downloadIcs,
} from "../lib/calendarLinks";
import "../styles/meeting-detail.css";
import { GoogleIcon } from "@/shared/ui/icons/GoogleIcon";
import { OutlookIcon } from "@/shared/ui/icons/OutlookIcon";
import { AppleIcon } from "@/shared/ui/icons/AppleIcon";
import { MicrosoftIcon } from "@/shared/ui/icons/MicrosoftIcon";
import type { Meeting } from "../types";

type AddToCalendarDropdownProps = {
  meeting: Meeting;
  compact?: boolean;
};

export function AddToCalendarDropdown({
  meeting,
  compact = false,
}: AddToCalendarDropdownProps) {
  const [open, setOpen] = useState(false);
  const [listPos, setListPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        !containerRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handleToggle() {
    if (!open && compact && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setListPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((prev) => !prev);
  }

  const items = (
    <ul
      ref={listRef}
      className="atc-dropdown__list"
      role="listbox"
      style={
        compact && listPos
          ? { position: "fixed", top: listPos.top, right: listPos.right }
          : undefined
      }
    >
      <li>
        <a
          className="atc-dropdown__item"
          href={buildGoogleUrl(meeting)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          <GoogleIcon width={16} height={16} /> Google Calendar
        </a>
      </li>
      <li>
        <a
          className="atc-dropdown__item"
          href={buildOutlookUrl(
            meeting,
            "https://outlook.live.com/calendar/0/deeplink/compose",
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          <OutlookIcon width={16} height={16} /> Outlook
        </a>
      </li>
      <li>
        <a
          className="atc-dropdown__item"
          href={buildOutlookUrl(
            meeting,
            "https://outlook.office.com/calendar/deeplink/compose",
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          <MicrosoftIcon width={16} height={16} /> Microsoft 365
        </a>
      </li>
      <li>
        <button
          type="button"
          className="atc-dropdown__item"
          onClick={() => {
            downloadIcs(meeting);
            setOpen(false);
          }}
        >
          <AppleIcon width={16} height={16} /> Apple / iCal
        </button>
      </li>
    </ul>
  );

  return (
    <div ref={containerRef} className="atc-dropdown">
      <button
        type="button"
        className={
          compact
            ? "atc-dropdown__trigger--compact"
            : "btn btn--ghost atc-dropdown__trigger"
        }
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={compact ? "Add to calendar" : undefined}
        title={compact ? "Add to calendar" : undefined}
      >
        {compact ? (
          <CalendarPlus size={16} />
        ) : (
          <>
            Add to calendar
            <ChevronDown
              size={14}
              className={open ? "atc-dropdown__chevron--open" : undefined}
            />
          </>
        )}
      </button>
      {open && (compact ? createPortal(items, document.body) : items)}
    </div>
  );
}
