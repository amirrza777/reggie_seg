"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "../api/client";
import { UpcomingList } from "./UpcomingList";

type Props = {
  events: CalendarEvent[];
  initialDate?: string;
  showLegend?: boolean;
  showUpcomingList?: boolean;
};

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_COLOR: Record<CalendarEvent["type"], string> = {
  task_open:        "#3b82f6",
  task_due:         "#ef4444",
  assessment_open:  "#3b82f6",
  assessment_due:   "#f59e0b",
  feedback_open:    "#3b82f6",
  feedback_due:     "rgba(32,173,120,1)",
  team_allocation_questionnaire_open: "#0ea5e9",
  team_allocation_questionnaire_due: "#f97316",
  meeting:          "#8b5cf6",
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarGrid({ events, initialDate, showLegend = true, showUpcomingList = true }: Props) {
  const today = new Date();
  const base = initialDate ? new Date(initialDate) : today;
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = isoDate(new Date(e.date));
    if (!eventsByDate.has(d)) eventsByDate.set(d, []);
    eventsByDate.get(d)!.push(e);
  }

  const todayStr = isoDate(today);

  const visibleEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : events.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });

  return (
    <div className={`calendar-wrapper${!showUpcomingList ? " calendar-wrapper--full" : ""}`}>
      <div className="calendar-grid-section">
        <div className="calendar-grid-header-bar">
          <div className="calendar-header">
            <button className="calendar-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-month-label">{MONTH_NAMES[month]} {year}</span>
            <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-grid-body">
          <div className="calendar-grid">
            {DAYS.map((d) => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="calendar-cell calendar-cell--empty" />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  className={[
                    "calendar-cell",
                    isToday ? "calendar-cell--today" : "",
                    isSelected ? "calendar-cell--selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <span className="calendar-day-num">{day}</span>
                  {dayEvents.length > 0 && (
                    <span className="calendar-dots">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className="calendar-dot"
                          style={{ background: TYPE_COLOR[e.type] }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showLegend && (
          <div className="calendar-legend">
            {(Object.entries(TYPE_COLOR) as [CalendarEvent["type"], string][]).map(([type, color]) => (
              <span key={type} className="calendar-legend-item">
                <span className="calendar-dot" style={{ background: color }} />
                <span className="calendar-legend-label">{type.replace(/_/g, " ")}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {showUpcomingList && (
        <div className="calendar-list-section">
          <UpcomingList
            events={visibleEvents}
            title={selectedDate ? `Events on ${selectedDate}` : `Events in ${MONTH_NAMES[month]}`}
          />
        </div>
      )}
    </div>
  );
}
