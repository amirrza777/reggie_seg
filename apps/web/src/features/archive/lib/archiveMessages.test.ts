import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveCalendarTooltip, projectArchiveModuleStatusTooltip } from "./archiveMessages";

vi.mock("@/shared/lib/formatDate", () => ({
  formatDate: vi.fn((s: string) => `formatted:${s}`),
}));

import { formatDate } from "@/shared/lib/formatDate";

describe("projectArchiveModuleStatusTooltip", () => {
  it("covers each module/project archive combination", () => {
    expect(projectArchiveModuleStatusTooltip(false, false)).toContain("both active");
    expect(projectArchiveModuleStatusTooltip(false, true)).toContain("project is archived");
    expect(projectArchiveModuleStatusTooltip(true, false)).toContain("parent module is archived");
    expect(projectArchiveModuleStatusTooltip(true, true)).toContain("Both the module and project are archived");
  });
});

describe("archiveCalendarTooltip", () => {
  beforeEach(() => {
    vi.mocked(formatDate).mockClear();
  });

  it("returns a fixed label when not archived", () => {
    expect(archiveCalendarTooltip("2026-01-01", false)).toBe("Not archived");
  });

  it("formats the date when archived with a timestamp", () => {
    expect(archiveCalendarTooltip("2026-01-02", true)).toBe("formatted:2026-01-02");
    expect(formatDate).toHaveBeenCalledWith("2026-01-02");
  });

  it("falls back when archived but no date is stored", () => {
    expect(archiveCalendarTooltip(null, true)).toBe("Archived (no date on file)");
    expect(archiveCalendarTooltip(undefined, true)).toBe("Archived (no date on file)");
  });
});
