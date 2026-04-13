type IcsMeetingData = {
  title: string;
  date: Date;
  location?: string | null;
  videoCallLink?: string | null;
  agenda?: string | null;
};

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcs(meeting: IcsMeetingData): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const start = fmt(meeting.date);
  const end = fmt(new Date(meeting.date.getTime() + 60 * 60 * 1000));
  const description = meeting.agenda ? escapeIcsText(meeting.agenda) : null;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reggie//Reggie//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(meeting.title)}`,
    meeting.location ? `LOCATION:${escapeIcsText(meeting.location)}` : null,
    meeting.videoCallLink ? `URL:${meeting.videoCallLink}` : null,
    description ? `DESCRIPTION:${description}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
