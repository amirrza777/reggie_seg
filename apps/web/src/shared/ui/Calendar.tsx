"use client";

import { useState } from "react";

export type CalendarEvent = {
  id: number;
  date: string;
  title: string;
};

type CalendarProps = {
  events: CalendarEvent[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar({ events }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    const base = events.length > 0 ? new Date(events[0].date) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const eventsByDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const d = new Date(event.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const existing = eventsByDay.get(day) ?? [];
      eventsByDay.set(day, [...existing, event]);
    }
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button type="button" className="calendar__nav" onClick={prevMonth}>←</button>
        <span className="calendar__month">{monthLabel}</span>
        <button type="button" className="calendar__nav" onClick={nextMonth}>→</button>
      </div>
      <div className="calendar__grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="calendar__day-label">{d}</div>
        ))}
        {cells.map((day, i) => {
          const dayEvents = day ? (eventsByDay.get(day) ?? []) : [];
          return (
            <div
              key={i}
              className={[
                "calendar__cell",
                !day ? "calendar__cell--empty" : "",
              ].filter(Boolean).join(" ")}
            >
              {day && (
                <>
                  <span className="calendar__date">{day}</span>
                  {dayEvents.map((e) => (
                    <span key={e.id} className="calendar__event" title={e.title}>
                      {e.title}
                    </span>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
