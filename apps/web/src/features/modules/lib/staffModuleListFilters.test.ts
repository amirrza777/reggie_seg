import { describe, expect, it } from "vitest";
import type { Module } from "../types";
import { partitionStaffModulesByArchive } from "./staffModuleListFilters";

describe("partitionStaffModulesByArchive", () => {
  it("splits by archivedAt", () => {
    const { unarchived, archived } = partitionStaffModulesByArchive([
      { id: "1", title: "Active", archivedAt: null },
      { id: "2", title: "Gone", archivedAt: "2026-01-01T00:00:00.000Z" },
      { id: "3", title: "Legacy" },
    ] satisfies Module[]);
    expect(unarchived.map((m) => m.id)).toEqual(["1", "3"]);
    expect(archived.map((m) => m.id)).toEqual(["2"]);
  });

  it("returns empty archived when none archived", () => {
    const { unarchived, archived } = partitionStaffModulesByArchive([
      { id: "1", title: "A", archivedAt: null },
    ] satisfies Module[]);
    expect(unarchived).toHaveLength(1);
    expect(archived).toHaveLength(0);
  });
});
