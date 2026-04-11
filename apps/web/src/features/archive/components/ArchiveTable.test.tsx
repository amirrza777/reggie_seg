import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ArchiveTableRowModel } from "../lib/archiveTableRows";
import { ArchiveTable } from "./ArchiveTable";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("ArchiveTable", () => {
  it("renders empty copy when there are no rows", () => {
    render(<ArchiveTable rows={[]} type="modules" loading={null} onToggle={vi.fn()} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("falls back to default empty copy", () => {
    render(<ArchiveTable rows={[]} type="projects" loading={null} onToggle={vi.fn()} />);
    expect(screen.getByText("No projects found.")).toBeInTheDocument();
  });

  it("renders module rows with archive action", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const rows: ArchiveTableRowModel[] = [
      { id: 1, name: "Mod", subtitle: "0 projects", archivedAt: null, href: "/staff/modules/1" },
    ];
    render(<ArchiveTable rows={rows} type="modules" loading={null} onToggle={onToggle} />);

    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(onToggle).toHaveBeenCalledWith("modules", 1, false);
  });

  it("renders project extras and unarchive for archived projects", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const rows: ArchiveTableRowModel[] = [
      {
        id: 10,
        name: "Proj",
        subtitle: "M · 1 team",
        archivedAt: "2026-01-01",
        href: "/staff/projects/10",
        moduleArchived: true,
        moduleArchivedAt: "2026-01-02",
        moduleStatusTitle: "Hint text",
      },
    ];
    render(<ArchiveTable rows={rows} type="projects" loading={null} onToggle={onToggle} />);

    expect(screen.getByRole("columnheader", { name: "Module status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unarchive" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(onToggle).toHaveBeenCalledWith("projects", 10, true);
  });

  it("disables the row button while that row is loading", () => {
    const rows: ArchiveTableRowModel[] = [
      { id: 2, name: "X", subtitle: "y", archivedAt: null, href: "/staff/modules/2" },
    ];
    render(<ArchiveTable rows={rows} type="modules" loading="modules-2" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "…" })).toBeDisabled();
  });
});
