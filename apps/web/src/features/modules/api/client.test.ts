import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { listModules } from "./client";

describe("modules api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches module list", async () => {
    const payload = [{ id: "mod-1", title: "Foundations" }];
    apiFetchMock.mockResolvedValue(payload);

    const result = await listModules(42);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42");
    expect(result).toEqual(payload);
  });

  it("fetches staff-scoped module list", async () => {
    await listModules(42, { scope: "staff" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&scope=staff");
  });
});
