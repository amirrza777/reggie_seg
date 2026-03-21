"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CalendarPlus } from "lucide-react";
import "../styles/meeting-detail.css";
import { GoogleIcon } from "@/shared/ui/GoogleIcon";
import { OutlookIcon } from "@/shared/ui/OutlookIcon";
import { AppleIcon } from "@/shared/ui/AppleIcon";
import { MicrosoftIcon } from "@/shared/ui/MicrosoftIcon";
import type { Meeting } from "../types";

type AddToCalendarDropdownProps = {
  meeting: Meeting;
  compact?: boolean;
};

function buildGoogleUrl(meeting: Meeting): string {
  const date = new Date(meeting.date);
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const utc = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const descParts = [];
  if (meeting.agenda) descParts.push(meeting.agenda);
  if (meeting.videoCallLink) descParts.push(`Video call: ${meeting.videoCallLink}`);
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", meeting.title);
  url.searchParams.set("dates", `${utc(date)}/${utc(end)}`);
  if (meeting.location) url.searchParams.set("location", meeting.location);
  if (descParts.length) url.searchParams.set("details", descParts.join("\n\n"));
  return url.toString();
}

function buildOutlookUrl(meeting: Meeting, baseUrl: string): string {
  const date = new Date(meeting.date);
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const descParts = [];
  if (meeting.agenda) descParts.push(meeting.agenda);
  if (meeting.videoCallLink) descParts.push(`Video call: ${meeting.videoCallLink}`);
  const params = new URLSearchParams({ subject: meeting.title, startdt: iso(date), enddt: iso(end) });
  if (meeting.location) params.set("location", meeting.location);
  if (descParts.length) params.set("body", descParts.join("\n\n"));
  return `${baseUrl}?${params}`;
}

function buildIcs(meeting: Meeting): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const date = new Date(meeting.date);
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  const descParts = [];
  if (meeting.agenda) descParts.push(meeting.agenda);
  if (meeting.videoCallLink) descParts.push(`Video call: ${meeting.videoCallLink}`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reggie//Reggie//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(date)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${meeting.title}`,
    meeting.location ? `LOCATION:${meeting.location}` : null,
    descParts.length ? `DESCRIPTION:${descParts.join("\\n\\n")}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function downloadIcs(meeting: Meeting) {
  const blob = new Blob([buildIcs(meeting)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meeting.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AddToCalendarDropdown({ meeting, compact = false }: AddToCalendarDropdownProps) {
  const [open, setOpen] = useState(false);
  const [listPos, setListPos] = useState<{ top: number; right: number } | null>(null);
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
      setListPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((prev) => !prev);
  }

  const items = (
    <ul
      ref={listRef}
      className="atc-dropdown__list"
      role="listbox"
      style={compact && listPos ? { position: "fixed", top: listPos.top, right: listPos.right } : undefined}
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
          href={buildOutlookUrl(meeting, "https://outlook.live.com/calendar/0/deeplink/compose")}
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
          href={buildOutlookUrl(meeting, "https://outlook.office.com/calendar/deeplink/compose")}
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
          onClick={() => { downloadIcs(meeting); setOpen(false); }}
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
        className={compact ? "atc-dropdown__trigger--compact" : "btn btn--ghost atc-dropdown__trigger"}
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
            <ChevronDown size={14} className={open ? "atc-dropdown__chevron--open" : undefined} />
          </>
        )}
      </button>
      {open && (compact ? createPortal(items, document.body) : items)}
    </div>
  );
}
