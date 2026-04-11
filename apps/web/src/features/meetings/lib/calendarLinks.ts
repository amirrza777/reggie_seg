import { buildIcs } from "./ics";
import type { Meeting } from "../types";

export function buildGoogleUrl(meeting: Meeting): string {
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

export function buildOutlookUrl(meeting: Meeting, baseUrl: string): string {
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

export function downloadIcs(meeting: Meeting) {
  const ics = buildIcs({
    title: meeting.title,
    date: new Date(meeting.date),
    location: meeting.location,
    videoCallLink: meeting.videoCallLink,
    agenda: meeting.agenda,
  });
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meeting.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
