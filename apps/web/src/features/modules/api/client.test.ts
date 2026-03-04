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

    const result = await listModules();

    expect(apiFetchMock).toHaveBeenCalledWith("/modules");
    expect(result).toEqual(payload);
  });
});
