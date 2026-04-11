import { describe, expect, it } from "vitest";
import { getArchiveTableRows } from "./archiveTableRows";
import type { ArchivableModule, ArchivableProject } from "../types";

describe("getArchiveTableRows", () => {
  const modules: ArchivableModule[] = [
    { id: 5, name: "Alpha", archivedAt: null, _count: { projects: 1 } },
    { id: 6, name: "Beta", archivedAt: null, _count: { projects: 2 } },
  ];

  const projects: ArchivableProject[] = [
    {
      id: 20,
      name: "P1",
      archivedAt: null,
      module: { name: "M1", archivedAt: null },
      _count: { teams: 1 },
    },
    {
      id: 21,
      name: "P2",
      archivedAt: "2026-02-01",
      module: { name: "M2", archivedAt: null },
      _count: { teams: 3 },
    },
  ];

  it("maps modules with singular project label", () => {
    const rows = getArchiveTableRows("modules", [modules[0]], []);
    expect(rows[0]).toMatchObject({
      id: 5,
      name: "Alpha",
      subtitle: "1 project",
      archivedAt: null,
      href: "/staff/modules/5",
    });
  });

  it("maps modules with plural project label", () => {
    const rows = getArchiveTableRows("modules", [modules[1]], []);
    expect(rows[0].subtitle).toBe("2 projects");
  });

  it("maps projects with module status metadata", () => {
    const rows = getArchiveTableRows("projects", [], projects);
    expect(rows[0]).toMatchObject({
      id: 20,
      name: "P1",
      subtitle: "M1 · 1 team",
      moduleArchived: false,
      moduleArchivedAt: null,
    });
    expect(rows[0].moduleStatusTitle).toBeDefined();
    expect(rows[1]).toMatchObject({
      id: 21,
      moduleArchived: false,
      href: "/staff/projects/21",
    });
    expect(rows[1].subtitle).toBe("M2 · 3 teams");
  });
});
