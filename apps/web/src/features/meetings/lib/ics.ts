type IcsMeetingData = {
  title: string;
  date: Date;
  location?: string | null;
  videoCallLink?: string | null;
  agenda?: string | null;
};

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function buildIcs(meeting: IcsMeetingData): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const start = fmt(meeting.date);
  const end = fmt(new Date(meeting.date.getTime() + 60 * 60 * 1000));
  const descParts = [];
  if (meeting.agenda) descParts.push(meeting.agenda);
  if (meeting.videoCallLink) descParts.push(`Video call: ${meeting.videoCallLink}`);
  const description = descParts.join("\\n\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reggie//Reggie//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(meeting.title)}`,
    meeting.location ? `LOCATION:${escapeIcsText(meeting.location)}` : null,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
