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
    <div className="stack ui-page calendar-page">
      <header className="ui-page__header">
        <h1 className="ui-page__title calendar-page__title">Calendar</h1>
        <p className="ui-page__description calendar-page__description">Your deadlines and meetings in one place.</p>
      </header>
      <CalendarGrid events={events} />
    </div>
  );
}
