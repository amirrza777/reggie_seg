import { describe, expect, it } from "vitest";
import {
  filterModulesByScope,
  filterProjectsByScope,
  isFullyActiveProject,
} from "./archiveScopes";
import type { ArchivableModule, ArchivableProject } from "../types";

const mod = (overrides: Partial<ArchivableModule> = {}): ArchivableModule => ({
  id: 1,
  name: "A",
  archivedAt: null,
  _count: { projects: 1 },
  ...overrides,
});

const proj = (overrides: Partial<ArchivableProject> = {}): ArchivableProject => ({
  id: 10,
  name: "P",
  archivedAt: null,
  module: { name: "M", archivedAt: null },
  _count: { teams: 2 },
  ...overrides,
});

describe("isFullyActiveProject", () => {
  it("is true when module and project are unarchived", () => {
    expect(isFullyActiveProject(proj())).toBe(true);
  });

  it("is false when the project is archived", () => {
    expect(isFullyActiveProject(proj({ archivedAt: "2026-01-01" }))).toBe(false);
  });

  it("is false when the module is archived", () => {
    expect(isFullyActiveProject(proj({ module: { name: "M", archivedAt: "2026-01-01" } }))).toBe(false);
  });
});

describe("filterModulesByScope", () => {
  const rows = [mod({ id: 1, archivedAt: null }), mod({ id: 2, archivedAt: "2026-01-01" })];

  it("returns only active modules", () => {
    expect(filterModulesByScope(rows, "active")).toEqual([rows[0]]);
  });

  it("returns only archived modules", () => {
    expect(filterModulesByScope(rows, "archived")).toEqual([rows[1]]);
  });

  it("returns all modules for all scope", () => {
    expect(filterModulesByScope(rows, "all")).toEqual(rows);
  });
});

describe("filterProjectsByScope", () => {
  const rows = [
    proj({ id: 1 }),
    proj({ id: 2, archivedAt: "2026-01-01" }),
    proj({ id: 3, module: { name: "M", archivedAt: "2026-01-01" } }),
  ];

  it("returns only fully active projects", () => {
    expect(filterProjectsByScope(rows, "active")).toEqual([rows[0]]);
  });

  it("returns projects that are not fully active", () => {
    expect(filterProjectsByScope(rows, "archived")).toEqual([rows[1], rows[2]]);
  });

  it("returns all projects for all scope", () => {
    expect(filterProjectsByScope(rows, "all")).toEqual(rows);
  });
});
