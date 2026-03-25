import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { joinModuleByCode, listModules } from "./client";

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

  it("fetches compact module list", async () => {
    await listModules(42, { compact: true });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&compact=1");
  });

  it("trims and forwards query for module list", async () => {
    await listModules(42, { query: "  segp  " });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules?userId=42&q=segp");
  });

  it("joins a module by code", async () => {
    await joinModuleByCode({ code: "ABCD2345" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/modules/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABCD2345" }),
    });
  });
});
