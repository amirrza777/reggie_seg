import { beforeEach, describe, expect, it, vi } from "vitest";

const getStaffProjectWarningsConfigMock = vi.fn();
const updateStaffProjectWarningsConfigMock = vi.fn();

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectWarningsConfig: (...args: unknown[]) => getStaffProjectWarningsConfigMock(...args),
  updateStaffProjectWarningsConfig: (...args: unknown[]) => updateStaffProjectWarningsConfigMock(...args),
}));

import { getProjectWarningsConfig, updateProjectWarningsConfig } from "./client";

describe("warnings api client wrappers", () => {
  beforeEach(() => {
    getStaffProjectWarningsConfigMock.mockReset();
    updateStaffProjectWarningsConfigMock.mockReset();
  });

  it("loads project warning config", async () => {
    getStaffProjectWarningsConfigMock.mockResolvedValue({ warningsConfig: { version: 1, rules: [] } });

    const result = await getProjectWarningsConfig(21);

    expect(getStaffProjectWarningsConfigMock).toHaveBeenCalledWith(21);
    expect(result).toEqual({ warningsConfig: { version: 1, rules: [] } });
  });

  it("updates project warning config", async () => {
    const payload = {
      version: 1,
      rules: [
        { key: "LOW_ATTENDANCE", enabled: true, severity: "HIGH", params: { minPercent: 30, lookbackDays: 30 } },
      ],
    } as any;
    updateStaffProjectWarningsConfigMock.mockResolvedValue({ warningsConfig: payload });

    const result = await updateProjectWarningsConfig(21, payload);

    expect(updateStaffProjectWarningsConfigMock).toHaveBeenCalledWith(21, payload);
    expect(result).toEqual({ warningsConfig: payload });
  });
});
