import { describe, expect, it } from "vitest";
import { getListStatus, SECTION_STATUS_LABELS } from "./listStatus";

describe("listStatus", () => {
  it("exports section labels for all supported states", () => {
    expect(SECTION_STATUS_LABELS).toEqual({
      information_only: "Information only",
      backlog: "Backlog",
      work_in_progress: "Work in progress",
      completed: "Completed",
    });
  });

  it("resolves status from section config using case and spacing normalization", () => {
    expect(getListStatus("Roadmap", { Roadmap: "information only" })).toBeNull();
    expect(getListStatus("To Do", { "To Do": "backlog" })).toBe("backlog");
    expect(getListStatus("Doing", { Doing: "work in progress" })).toBe("inProgress");
    expect(getListStatus("Done", { Done: "completed" })).toBe("completed");
  });

  it("falls back to name-based defaults when no config mapping exists", () => {
    expect(getListStatus("Backlog")).toBe("backlog");
    expect(getListStatus("Completed")).toBe("completed");
    expect(getListStatus("In Flight")).toBe("inProgress");
  });
});

