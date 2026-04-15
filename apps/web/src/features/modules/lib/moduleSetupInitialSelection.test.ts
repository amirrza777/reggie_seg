import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnterpriseModuleAccessSelection } from "@/features/enterprise/api/client";
import { loadModuleSetupInitialSelection } from "./moduleSetupInitialSelection";

vi.mock("@/features/enterprise/api/client", () => ({
  getEnterpriseModuleAccessSelection: vi.fn(),
}));

const getEnterpriseModuleAccessSelectionMock = vi.mocked(getEnterpriseModuleAccessSelection);

describe("loadModuleSetupInitialSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enterprise selection when no staff row is provided", async () => {
    const selection = {
      module: {
        id: 1,
        name: "API",
        briefText: "api brief",
        expectationsText: "api exp",
        readinessNotesText: "api ready",
      },
      leaderIds: [1],
      taIds: [],
      studentIds: [],
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>;
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce(selection);

    const merged = await loadModuleSetupInitialSelection(1);
    expect(merged).toEqual(selection);
  });

  it("merges empty API guidance strings from the staff module list row", async () => {
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce({
      module: {
        id: 2,
        name: "",
        briefText: "",
        expectationsText: "",
        readinessNotesText: "",
      },
      leaderIds: [],
      taIds: [],
      studentIds: [],
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>);

    const merged = await loadModuleSetupInitialSelection(2, {
      title: "Row title",
      briefText: "row brief",
      expectationsText: "row exp",
      readinessNotesText: "row ready",
    });

    expect(merged?.module.name).toBe("Row title");
    expect(merged?.module.briefText).toBe("row brief");
    expect(merged?.module.expectationsText).toBe("row exp");
    expect(merged?.module.readinessNotesText).toBe("row ready");
  });

  it("prefers non-empty API values over staff row", async () => {
    getEnterpriseModuleAccessSelectionMock.mockResolvedValueOnce({
      module: {
        id: 3,
        name: "API name",
        briefText: "api brief",
        expectationsText: "api exp",
        readinessNotesText: "api ready",
      },
      leaderIds: [],
      taIds: [],
      studentIds: [],
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>);

    const merged = await loadModuleSetupInitialSelection(3, {
      title: "Row title",
      briefText: "row brief",
      expectationsText: "row exp",
      readinessNotesText: "row ready",
    });

    expect(merged?.module.name).toBe("API name");
    expect(merged?.module.briefText).toBe("api brief");
    expect(merged?.module.expectationsText).toBe("api exp");
    expect(merged?.module.readinessNotesText).toBe("api ready");
  });

  it("returns null when the enterprise fetch fails", async () => {
    getEnterpriseModuleAccessSelectionMock.mockRejectedValueOnce(new Error("Forbidden"));
    const merged = await loadModuleSetupInitialSelection(9);
    expect(merged).toBeNull();
  });
});
