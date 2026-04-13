import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArchivableModule, ArchivableProject } from "../types";
import { ArchiveManager } from "./ArchiveManager";

const getArchiveModules = vi.fn();
const getArchiveProjects = vi.fn();
const archiveItem = vi.fn();
const unarchiveItem = vi.fn();

vi.mock("../api/client", () => ({
  getArchiveModules: (...a: unknown[]) => getArchiveModules(...a),
  getArchiveProjects: (...a: unknown[]) => getArchiveProjects(...a),
  archiveItem: (...a: unknown[]) => archiveItem(...a),
  unarchiveItem: (...a: unknown[]) => unarchiveItem(...a),
}));

vi.mock("@/shared/ui/skeletons/Skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton" />,
}));

const activeModule: ArchivableModule = {
  id: 1,
  name: "Visible",
  archivedAt: null,
  _count: { projects: 1 },
};

const archivedModule: ArchivableModule = {
  id: 2,
  name: "HiddenByDefaultScope",
  archivedAt: "2026-01-01",
  _count: { projects: 0 },
};

const activeProject: ArchivableProject = {
  id: 10,
  name: "Proj",
  archivedAt: null,
  module: { name: "M", archivedAt: null },
  _count: { teams: 1 },
};

describe("ArchiveManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getArchiveModules.mockResolvedValue([activeModule, archivedModule]);
    getArchiveProjects.mockResolvedValue([activeProject]);
    archiveItem.mockResolvedValue(undefined);
    unarchiveItem.mockResolvedValue(undefined);
  });

  it("shows a skeleton while fetching", () => {
    getArchiveModules.mockImplementation(() => new Promise(() => {}));
    getArchiveProjects.mockImplementation(() => new Promise(() => {}));
    render(<ArchiveManager />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("defaults to archived module filter and can switch tabs", async () => {
    const user = userEvent.setup();
    render(<ArchiveManager />);

    await waitFor(() => expect(screen.getByRole("tab", { name: "Modules" })).toBeInTheDocument());
    expect(screen.queryByText("Visible")).not.toBeInTheDocument();
    expect(screen.getByText("HiddenByDefaultScope")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(await screen.findByText("Visible")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Projects" }));
    expect(await screen.findByText("Proj")).toBeInTheDocument();
  });
});
