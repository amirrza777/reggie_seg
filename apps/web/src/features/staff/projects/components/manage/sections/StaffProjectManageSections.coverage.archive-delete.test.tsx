import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import {
  buildInitial,
  deleteMock,
  patchMock,
  StaffProjectManageArchiveOrDeleteSection,
  withProvider,
} from "./StaffProjectManageSections.coverage.shared";

describe("StaffProjectManageArchiveOrDeleteSection coverage", () => {
  it("shows pending label while archive request runs", async () => {
    const user = userEvent.setup();
    let resolveArchive!: (v: StaffProjectManageSummary) => void;
    patchMock.mockImplementationOnce(
      () =>
        new Promise<StaffProjectManageSummary>((r) => {
          resolveArchive = r;
        }),
    );
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, buildInitial()));
    const archiveSection = screen.getByRole("heading", { name: "Archive project" }).closest("div")!;
    await user.click(within(archiveSection).getByRole("checkbox"));
    await user.click(within(archiveSection).getByRole("button", { name: /archive project/i }));
    expect(within(archiveSection).getByRole("button", { name: /updating/i })).toBeInTheDocument();
    resolveArchive!(buildInitial({ archivedAt: "2026-04-01T00:00:00.000Z" }));
    await waitFor(() =>
      expect(within(archiveSection).queryByRole("button", { name: /updating/i })).not.toBeInTheDocument(),
    );
  });

  it("shows pending label while unarchive request runs", async () => {
    const user = userEvent.setup();
    let resolveUnarchive!: (v: StaffProjectManageSummary) => void;
    patchMock.mockImplementationOnce(
      () =>
        new Promise<StaffProjectManageSummary>((r) => {
          resolveUnarchive = r;
        }),
    );
    const unarchiveInitial = buildInitial({ archivedAt: "2026-04-01T00:00:00.000Z" });
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, unarchiveInitial));
    const unarchiveSection = screen.getByRole("heading", { name: "Unarchive project" }).closest("div")!;
    await user.click(within(unarchiveSection).getByRole("checkbox"));
    await user.click(within(unarchiveSection).getByRole("button", { name: /unarchive project/i }));
    expect(within(unarchiveSection).getByRole("button", { name: /updating/i })).toBeInTheDocument();
    resolveUnarchive!(buildInitial());
    await waitFor(() =>
      expect(within(unarchiveSection).queryByRole("button", { name: /updating/i })).not.toBeInTheDocument(),
    );
  });

  it("shows pending label while delete request runs", async () => {
    const user = userEvent.setup();
    let resolveDelete!: (v: { moduleId: number }) => void;
    deleteMock.mockImplementationOnce(
      () =>
        new Promise<{ moduleId: number }>((r) => {
          resolveDelete = r;
        }),
    );
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, buildInitial()));
    const deleteHeading = screen.getByRole("heading", { name: "Delete project" });
    const deleteSection = deleteHeading.closest("div")!;
    await user.click(within(deleteSection).getByRole("checkbox"));
    await user.click(within(deleteSection).getByRole("button", { name: /delete project/i }));
    expect(within(deleteSection).getByRole("button", { name: /deleting/i })).toBeInTheDocument();
    resolveDelete!({ moduleId: 99 });
    await waitFor(() =>
      expect(within(deleteSection).queryByRole("button", { name: /deleting/i })).not.toBeInTheDocument(),
    );
  });
});
