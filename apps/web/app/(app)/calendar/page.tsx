import { getCurrentUser } from "@/shared/auth/session";
import { getCalendarEvents } from "@/features/calendar/api/client";
import { CalendarGrid } from "@/features/calendar/components/CalendarGrid";
import "../../styles/calendar.css";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  let events: Awaited<ReturnType<typeof getCalendarEvents>> = [];

  if (user) {
    try {
      events = await getCalendarEvents(user.id);
    } catch {
      events = [];
    }
  }

  return (
    <div className="stack ui-page">
      <header>
        <h1>Calendar</h1>
        <p className="muted">Your deadlines and meetings in one place.</p>
      </header>
      <CalendarGrid events={events} />
    </div>
  );
}
