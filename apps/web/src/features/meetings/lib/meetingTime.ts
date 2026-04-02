export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function isWithinEditWindow(meetingDate: string, windowDays: number): boolean {
  const elapsed = Date.now() - new Date(meetingDate).getTime();
  return elapsed <= daysToMs(windowDays);
}
