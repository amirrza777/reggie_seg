import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { archiveItem, unarchiveItem } from "@/features/archive/api/client";
import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  updateEnterpriseModule,
} from "../../api/client";
import { useEnterpriseModuleAccessBuckets } from "./useEnterpriseModuleAccessBuckets";
import { useEnterpriseModuleCreateFormState } from "./useEnterpriseModuleCreateFormState";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("../../api/client", () => ({
  createEnterpriseModule: vi.fn(),
  deleteEnterpriseModule: vi.fn(),
  getEnterpriseModuleAccessSelection: vi.fn(),
  updateEnterpriseModule: vi.fn(),
}));

vi.mock("./useEnterpriseModuleAccessBuckets", () => ({
  useEnterpriseModuleAccessBuckets: vi.fn(),
}));

vi.mock("@/features/archive/api/client", () => ({
  archiveItem: vi.fn(),
  unarchiveItem: vi.fn(),
}));

const useRouterMock = vi.mocked(useRouter);
const createEnterpriseModuleMock = vi.mocked(createEnterpriseModule);
const deleteEnterpriseModuleMock = vi.mocked(deleteEnterpriseModule);
const getEnterpriseModuleAccessSelectionMock = vi.mocked(getEnterpriseModuleAccessSelection);
const updateEnterpriseModuleMock = vi.mocked(updateEnterpriseModule);
const useEnterpriseModuleAccessBucketsMock = vi.mocked(useEnterpriseModuleAccessBuckets);
const archiveItemMock = vi.mocked(archiveItem);
const unarchiveItemMock = vi.mocked(unarchiveItem);

describe("useEnterpriseModuleCreateFormState (archive + selection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ push: pushMock, refresh: refreshMock } as ReturnType<typeof useRouter>);
    useEnterpriseModuleAccessBucketsMock.mockReturnValue({} as ReturnType<typeof useEnterpriseModuleAccessBuckets>);
    createEnterpriseModuleMock.mockResolvedValue({
      id: 44,
      name: "Created",
      code: "MOD44",
      joinCode: "JOIN44",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      studentCount: 0,
      leaderCount: 0,
      teachingAssistantCount: 0,
    });
    getEnterpriseModuleAccessSelectionMock.mockResolvedValue({
      module: {
        id: 77,
        name: "Existing module",
        code: "old77",
        briefText: "Old brief",
        expectationsText: "Old expectations",
        readinessNotesText: "Old readiness",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        studentCount: 1,
        leaderCount: 1,
        teachingAssistantCount: 1,
      },
      leaderIds: [11],
      taIds: [12],
      studentIds: [31],
    });
    updateEnterpriseModuleMock.mockResolvedValue({
      id: 77,
      name: "Updated",
      code: "NEW77",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      studentCount: 1,
      leaderCount: 1,
      teachingAssistantCount: 1,
    });
    deleteEnterpriseModuleMock.mockResolvedValue({ moduleId: 77, deleted: true });
    archiveItemMock.mockResolvedValue({ entityType: "modules", entityId: 77, archived: true } as any);
    unarchiveItemMock.mockResolvedValue({ entityType: "modules", entityId: 77, archived: false } as any);
  });

  it("normalizes nullable module selection values and supports staff create redirect", async () => {
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce({
      module: {
        id: 88,
        name: undefined,
        code: undefined,
        briefText: undefined,
        expectationsText: undefined,
        readinessNotesText: undefined,
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        studentCount: 0,
        leaderCount: 0,
        teachingAssistantCount: 0,
      },
      leaderIds: [],
      taIds: [],
      studentIds: [],
    });

    const edit = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 88,
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(edit.result.current.isLoadingAccess).toBe(false));
    expect(edit.result.current.moduleName).toBe("");
    expect(edit.result.current.moduleCode).toBe("");
    expect(edit.result.current.briefText).toBe("");

    const create = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "staff",
      }),
    );
    await waitFor(() => expect(create.result.current.isLoadingAccess).toBe(false));

    act(() => {
      create.result.current.handleModuleNameChange("Staff module");
      create.result.current.toggleLeader(12, true);
    });
    await act(async () => {
      await create.result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(pushMock).toHaveBeenCalledWith("/staff/modules/44/manage?created=1");
  });

  it("handles archive and unarchive flows including guards and notices", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));

    await act(async () => {
      await result.current.handleArchiveModule();
    });
    expect(archiveItemMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setConfirmArchiveModule(true);
    });
    await act(async () => {
      await result.current.handleArchiveModule();
    });
    expect(archiveItemMock).toHaveBeenCalledWith("modules", 77);
    expect(result.current.moduleArchived).toBe(true);
    expect(result.current.archiveActionNotice).toBe("Module archived. The sections above are now read-only.");
    expect(result.current.confirmArchiveModule).toBe(false);
    expect(refreshMock).toHaveBeenCalled();

    await act(async () => {
      await result.current.handleArchiveModule();
    });
    expect(archiveItemMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setConfirmUnarchiveModule(true);
    });
    await act(async () => {
      await result.current.handleUnarchiveModule();
    });
    expect(unarchiveItemMock).toHaveBeenCalledWith("modules", 77);
    expect(result.current.moduleArchived).toBe(false);
    expect(result.current.archiveActionNotice).toBe("Module unarchived. You can edit the sections above again.");
    expect(result.current.confirmUnarchiveModule).toBe(false);
  });

  it("covers archive/unarchive missing-id and fallback error branches", async () => {
    const missingId = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(missingId.result.current.isLoadingAccess).toBe(false));

    act(() => {
      missingId.result.current.setConfirmArchiveModule(true);
    });
    await act(async () => {
      await missingId.result.current.handleArchiveModule();
    });
    expect(missingId.result.current.errorMessage).toBe("Module id is required for edit mode.");

    const edit = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(edit.result.current.isLoadingAccess).toBe(false));

    act(() => {
      edit.result.current.setConfirmArchiveModule(true);
    });
    archiveItemMock.mockRejectedValueOnce("archive-failed");
    await act(async () => {
      await edit.result.current.handleArchiveModule();
    });
    expect(edit.result.current.errorMessage).toBe("Could not archive module.");

    act(() => {
      edit.result.current.setConfirmArchiveModule(true);
    });
    await act(async () => {
      await edit.result.current.handleArchiveModule();
    });
    expect(edit.result.current.moduleArchived).toBe(true);

    act(() => {
      edit.result.current.setConfirmUnarchiveModule(true);
    });
    unarchiveItemMock.mockRejectedValueOnce("unarchive-failed");
    await act(async () => {
      await edit.result.current.handleUnarchiveModule();
    });
    expect(edit.result.current.errorMessage).toBe("Could not unarchive module.");
  });

  it("handles edit submit validation and no-ops archive controls in create mode", async () => {
    const edit = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(edit.result.current.isLoadingAccess).toBe(false));

    act(() => {
      edit.result.current.handleModuleNameChange("   ");
    });
    await act(async () => {
      await edit.result.current.performSubmit();
    });
    expect(edit.result.current.moduleNameError).toBe("Module name is required.");

    const create = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(create.result.current.isLoadingAccess).toBe(false));
    await act(async () => {
      await create.result.current.handleArchiveModule();
    });
    await act(async () => {
      await create.result.current.handleUnarchiveModule();
    });
    expect(archiveItemMock).not.toHaveBeenCalledWith("modules", expect.any(Number));
    expect(unarchiveItemMock).not.toHaveBeenCalledWith("modules", expect.any(Number));
  });

  it("covers unarchive guards for non-archived and missing-id states", async () => {
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce({
      module: {
        id: 77,
        name: "Archived module",
        code: "MOD77",
        briefText: "",
        expectationsText: "",
        readinessNotesText: "",
        archivedAt: "2026-03-10T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        studentCount: 0,
        leaderCount: 1,
        teachingAssistantCount: 0,
      },
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    } as any);

    const { result, rerender } = renderHook(
      (props: { moduleId?: number }) =>
        useEnterpriseModuleCreateFormState({
          mode: "edit",
          moduleId: props.moduleId,
          workspace: "enterprise",
        }),
      { initialProps: { moduleId: 77 } },
    );

    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));
    expect(result.current.moduleArchived).toBe(true);

    act(() => {
      result.current.setConfirmUnarchiveModule(true);
    });
    rerender({ moduleId: undefined });
    await act(async () => {
      await result.current.handleUnarchiveModule();
    });
    expect(result.current.errorMessage).toBe("Module id is required for edit mode.");

    const nonArchived = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      }),
    );
    await waitFor(() => expect(nonArchived.result.current.isLoadingAccess).toBe(false));
    expect(nonArchived.result.current.moduleArchived).toBe(false);
    await act(async () => {
      await nonArchived.result.current.handleUnarchiveModule();
    });
    expect(unarchiveItemMock).not.toHaveBeenCalledWith("modules", 77);
  });
});
