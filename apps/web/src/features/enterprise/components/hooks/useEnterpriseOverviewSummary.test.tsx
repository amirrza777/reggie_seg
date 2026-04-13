import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getEnterpriseOverviewMock = vi.fn();
const buildEnterpriseOverviewSummaryViewMock = vi.fn();

vi.mock("../../api/client", () => ({
  getEnterpriseOverview: (...args: unknown[]) => getEnterpriseOverviewMock(...args),
}));

vi.mock("../enterpriseOverviewSummary.logic", () => ({
  buildEnterpriseOverviewSummaryView: (...args: unknown[]) =>
    buildEnterpriseOverviewSummaryViewMock(...args),
}));

import { useEnterpriseOverviewSummary } from "./useEnterpriseOverviewSummary";

describe("useEnterpriseOverviewSummary", () => {
  beforeEach(() => {
    getEnterpriseOverviewMock.mockReset();
    buildEnterpriseOverviewSummaryViewMock.mockReset();
    buildEnterpriseOverviewSummaryViewMock.mockReturnValue({
      riskItems: [],
      quickHealthChecks: [],
      operationalRatios: [],
      actionQueue: [],
      priorityActionCount: 0,
      roleDistribution: [],
      setupChecklist: [],
      completedChecklistItems: 0,
      lastUpdatedLabel: null,
      priorityBanner: { tone: "success", text: "ok" },
    });
  });

  it("loads overview successfully and computes summary view", async () => {
    const overview = { totals: { users: 10 } };
    getEnterpriseOverviewMock.mockResolvedValue(overview);

    const { result } = renderHook(() => useEnterpriseOverviewSummary());

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.overview).toEqual(overview);
    expect(result.current.message).toBeNull();
    expect(buildEnterpriseOverviewSummaryViewMock).toHaveBeenCalled();
  });

  it("handles errors and surfaces fallback messages for unknown failures", async () => {
    getEnterpriseOverviewMock.mockRejectedValueOnce(new Error("Boom"));
    const first = renderHook(() => useEnterpriseOverviewSummary());
    await waitFor(() => expect(first.result.current.status).toBe("error"));
    expect(first.result.current.message).toBe("Boom");

    getEnterpriseOverviewMock.mockRejectedValueOnce("bad");
    const second = renderHook(() => useEnterpriseOverviewSummary());
    await waitFor(() => expect(second.result.current.status).toBe("error"));
    expect(second.result.current.message).toBe("Could not load enterprise overview.");
  });
});
