import { useMemo, useState } from "react";
import type { SortConfig } from "@/shared/ui/Table";
import type { Meeting } from "../types";

function compareMeetings(a: Meeting, b: Meeting, column: number, showMinutesWriter: boolean): number {
  switch (column) {
    case 0:
      return a.title.localeCompare(b.title);
    case 1:
      return a.date.localeCompare(b.date);
    case 2:
      return `${a.organiser.firstName} ${a.organiser.lastName}`.localeCompare(`${b.organiser.firstName} ${b.organiser.lastName}`);
    case 3: {
      if (showMinutesWriter) {
        const nameA = a.minutes ? `${a.minutes.writer.firstName} ${a.minutes.writer.lastName}` : "";
        const nameB = b.minutes ? `${b.minutes.writer.firstName} ${b.minutes.writer.lastName}` : "";
        return nameA.localeCompare(nameB);
      }
      return (a.location ?? "").localeCompare(b.location ?? "");
    }
    case 4: {
      if (!showMinutesWriter) {
        return (a.participants?.length ?? 0) - (b.participants?.length ?? 0);
      }
      return 0;
    }
    default:
      return 0;
  }
}

export function useMeetingSort(meetings: Meeting[], showMinutesWriter: boolean) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 1,
    direction: showMinutesWriter ? "desc" : "asc",
  });

  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      return dir * compareMeetings(a, b, sortConfig.column, showMinutesWriter);
    });
  }, [meetings, sortConfig, showMinutesWriter]);

  function handleSort(columnIndex: number) {
    if (columnIndex === 5) return;
    if (showMinutesWriter && columnIndex === 4) return;
    setSortConfig((prev) =>
      prev.column === columnIndex
        ? { column: columnIndex, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: columnIndex, direction: "asc" }
    );
  }

  return { sorted, sortConfig, handleSort };
}
