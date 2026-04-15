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

describe("useEnterpriseModuleCreateFormState", () => {
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

  it("validates and submits create mode payloads", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "enterprise",
      })
    );

    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));
    expect(result.current.canEditModule).toBe(true);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.moduleNameError).toBe("Module name is required.");

    act(() => {
      result.current.handleModuleNameChange("  New Module  ");
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.errorMessage).toBe("Select at least one module leader before creating the module.");

    act(() => {
      result.current.toggleLeader(10, true);
      result.current.setModuleCode(" mod44 ");
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(createEnterpriseModuleMock).toHaveBeenCalledWith({
      name: "New Module",
      code: "MOD44",
      leaderIds: [10],
    });
    expect(pushMock).toHaveBeenCalledWith("/enterprise/modules/44/edit?created=1");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("surfaces edit-mode moduleId requirement when missing", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        workspace: "enterprise",
      })
    );

    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));
    expect(result.current.canEditModule).toBe(false);
    expect(result.current.errorMessage).toBe("Module id is required for edit mode.");
  });

  it("loads edit selections and submits normalized update payloads", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "staff",
        successRedirectAfterUpdateHref: "/staff/modules/77/manage",
      })
    );

    await waitFor(() => expect(getEnterpriseModuleAccessSelectionMock).toHaveBeenCalledWith(77));
    await waitFor(() => expect(result.current.moduleName).toBe("Existing module"));
    expect(result.current.moduleCode).toBe("old77");
    expect(result.current.leaderIds).toEqual([11]);
    expect(result.current.taIds).toEqual([12]);
    expect(result.current.studentIds).toEqual([31]);

    act(() => {
      result.current.handleModuleNameChange(" Updated module ");
      result.current.setModuleCode(" new77 ");
      result.current.setBriefText("Brief line 1  \nBrief line 2   ");
      result.current.setExpectationsText("");
      result.current.setReadinessNotesText("Ready now   ");
      result.current.toggleTeachingAssistant(13, true);
      result.current.toggleStudent(31, false);
      result.current.toggleStudent(41, true);
    });

    await act(async () => {
      await result.current.performSubmit();
    });

    expect(updateEnterpriseModuleMock).toHaveBeenCalledWith(77, {
      name: "Updated module",
      code: "NEW77",
      briefText: "Brief line 1\nBrief line 2",
      expectationsText: undefined,
      readinessNotesText: "Ready now",
      leaderIds: [11],
      taIds: [12, 13],
      studentIds: [41],
    });
    expect(pushMock).toHaveBeenCalledWith("/staff/modules/77/manage");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("handles edit delete confirmations and delete failure recovery", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "staff",
      })
    );
    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));

    await act(async () => {
      await result.current.handleDeleteModule();
    });
    expect(deleteEnterpriseModuleMock).not.toHaveBeenCalled();

    act(() => {
      result.current.setConfirmDeleteModule(true);
    });
    deleteEnterpriseModuleMock.mockRejectedValueOnce(new Error("Delete failed."));
    await act(async () => {
      await result.current.handleDeleteModule();
    });
    expect(result.current.errorMessage).toBe("Delete failed.");
    expect(result.current.isDeleting).toBe(false);

    await act(async () => {
      await result.current.handleDeleteModule();
    });
    expect(deleteEnterpriseModuleMock).toHaveBeenCalledWith(77);
    expect(pushMock).toHaveBeenCalledWith("/staff/modules");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("maps forbidden create errors to module-owner guidance", async () => {
    createEnterpriseModuleMock.mockRejectedValueOnce(new Error("Forbidden"));

    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));

    act(() => {
      result.current.handleModuleNameChange("Restricted module");
      result.current.toggleLeader(901, true);
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(result.current.errorMessage).toBe("Only module owners/leaders can edit this module.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("uses generic fallback errors for non-Error failures and supports navigateHome", async () => {
    getEnterpriseModuleAccessSelectionMock.mockRejectedValueOnce("load-failed");

    const loadFailure = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 88,
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(loadFailure.result.current.isLoadingAccess).toBe(false));
    expect(loadFailure.result.current.errorMessage).toBe("Could not load module access options.");

    createEnterpriseModuleMock.mockRejectedValueOnce("create-failed");
    const createFailure = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "staff",
      })
    );
    await waitFor(() => expect(createFailure.result.current.isLoadingAccess).toBe(false));

    act(() => {
      createFailure.result.current.handleModuleNameChange("New module");
      createFailure.result.current.toggleLeader(55, true);
    });
    await act(async () => {
      await createFailure.result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(createFailure.result.current.errorMessage).toBe("Could not create module.");
    expect(createFailure.result.current.isSubmitting).toBe(false);

    act(() => {
      createFailure.result.current.navigateHome();
    });
    expect(pushMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("covers edit validation, edit fallback errors, and delete guards", async () => {
    const { result } = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(result.current.isLoadingAccess).toBe(false));

    act(() => {
      result.current.handleModuleNameChange("   ");
    });
    await act(async () => {
      await result.current.performSubmit();
    });
    expect(result.current.moduleNameError).toBe("Module name is required.");

    act(() => {
      result.current.handleModuleNameChange("Edited module");
    });
    updateEnterpriseModuleMock.mockRejectedValueOnce("update-failed");
    await act(async () => {
      await result.current.performSubmit();
    });
    expect(result.current.errorMessage).toBe("Could not update module.");
    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.setConfirmDeleteModule(true);
    });
    deleteEnterpriseModuleMock.mockRejectedValueOnce("delete-failed");
    await act(async () => {
      await result.current.handleDeleteModule();
    });
    expect(result.current.errorMessage).toBe("Could not delete module.");
    expect(result.current.isDeleting).toBe(false);

    const missingId = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(missingId.result.current.isLoadingAccess).toBe(false));
    await act(async () => {
      await missingId.result.current.handleDeleteModule();
    });
    expect(missingId.result.current.errorMessage).toBe("Module id is required for edit mode.");
  });

  it("submits edit mode through handleSubmit and exercises create-mode delete no-op", async () => {
    const edit = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "edit",
        moduleId: 77,
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(edit.result.current.isLoadingAccess).toBe(false));

    act(() => {
      edit.result.current.handleModuleNameChange("Submitted through handleSubmit");
    });
    await act(async () => {
      await edit.result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });
    expect(updateEnterpriseModuleMock).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ name: "Submitted through handleSubmit" })
    );

    const create = renderHook(() =>
      useEnterpriseModuleCreateFormState({
        mode: "create",
        workspace: "enterprise",
      })
    );
    await waitFor(() => expect(create.result.current.isLoadingAccess).toBe(false));

    await act(async () => {
      await create.result.current.handleDeleteModule();
    });
    expect(deleteEnterpriseModuleMock).not.toHaveBeenCalledWith(expect.any(Number));

    act(() => {
      create.result.current.toggleLeader(40, true);
      create.result.current.toggleLeader(40, true);
      create.result.current.toggleLeader(40, false);
      create.result.current.toggleTeachingAssistant(41, true);
      create.result.current.toggleTeachingAssistant(41, false);
    });
    expect(create.result.current.leaderIds).toEqual([]);
    expect(create.result.current.taIds).toEqual([]);
  });

});
