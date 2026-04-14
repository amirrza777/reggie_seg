import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnterpriseModuleAccessSelection } from "@/features/enterprise/api/client";
import { loadModuleSetupInitialSelection } from "./moduleSetupInitialSelection";

vi.mock("@/features/enterprise/api/client", () => ({
  getEnterpriseModuleAccessSelection: vi.fn(),
}));

const getSelectionMock = vi.mocked(getEnterpriseModuleAccessSelection);

describe("loadModuleSetupInitialSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the enterprise API fails", async () => {
    getSelectionMock.mockRejectedValue(new Error("boom"));
    await expect(loadModuleSetupInitialSelection(1)).resolves.toBeNull();
  });

  it("returns enterprise payload unchanged when no staff row is provided", async () => {
    const payload = {
      module: {
        name: "API",
        briefText: "b",
        timelineText: "t",
        expectationsText: "e",
        readinessNotesText: "r",
      },
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>;
    getSelectionMock.mockResolvedValue(payload);
    await expect(loadModuleSetupInitialSelection(2)).resolves.toEqual(payload);
  });

  it("merges empty API guidance strings from the staff module row", async () => {
    getSelectionMock.mockResolvedValue({
      module: {
        name: "",
        briefText: "",
        timelineText: "",
        expectationsText: "",
        readinessNotesText: "",
      },
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>);

    const merged = await loadModuleSetupInitialSelection(3, {
      title: "Row title",
      briefText: "row brief",
      timelineText: "row time",
      expectationsText: "row exp",
      readinessNotesText: "row ready",
    });

    expect(merged?.module.name).toBe("Row title");
    expect(merged?.module.briefText).toBe("row brief");
    expect(merged?.module.timelineText).toBe("row time");
    expect(merged?.module.expectationsText).toBe("row exp");
    expect(merged?.module.readinessNotesText).toBe("row ready");
  });

  it("keeps non-empty API values over staff row values", async () => {
    getSelectionMock.mockResolvedValue({
      module: {
        name: " API Name ",
        briefText: "api brief",
        timelineText: "api time",
        expectationsText: "api exp",
        readinessNotesText: "api ready",
      },
    } as Awaited<ReturnType<typeof getEnterpriseModuleAccessSelection>>);

    const merged = await loadModuleSetupInitialSelection(4, {
      title: "Row title",
      briefText: "row brief",
      timelineText: "row time",
      expectationsText: "row exp",
      readinessNotesText: "row ready",
    });

    expect(merged?.module.name).toBe(" API Name ");
    expect(merged?.module.briefText).toBe("api brief");
    expect(merged?.module.timelineText).toBe("api time");
    expect(merged?.module.expectationsText).toBe("api exp");
    expect(merged?.module.readinessNotesText).toBe("api ready");
  });
});
