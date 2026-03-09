/** Monday of the week for date (local time), as YYYY-MM-DD. */
export function getWeekStartKeyLocal(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayFromMon = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayFromMon);
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Monday of the week for date */
export function getWeekStartKeyUTC(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayFromMon = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayFromMon);
  return d.toISOString().slice(0, 10);
}

export function addDaysUTC(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** weekKey is Monday; returns Sunday (end of week). */
export function getEndOfWeekDateKey(weekKey: string): string {
  return addDaysUTC(weekKey, 6);
}

/** weekKey is Monday YYYY-MM-DD */
export function getStartOfWeekDateKey(weekKey: string): string {
  return weekKey;
}

/** Monday date keys for each week overlapping [startDateKey, endDateKey]. */
export function getWeekKeysBetweenDateKeys(startDateKey: string, endDateKey: string): string[] {
  const keys: string[] = [];
  let weekStart = getWeekStartKeyUTC(new Date(startDateKey + "T12:00:00Z"));
  while (weekStart <= endDateKey) {
    keys.push(weekStart);
    weekStart = addDaysUTC(weekStart, 7);
  }
  return keys;
}
