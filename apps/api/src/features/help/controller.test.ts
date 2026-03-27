import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const serviceMocks = vi.hoisted(() => ({
  parseHelpSearchPayload: vi.fn(),
  searchHelpRecords: vi.fn(),
}));

vi.mock("./service.js", () => serviceMocks);

import { searchHelpHandler } from "./controller.js";

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

describe("help controller", () => {
  it("returns 400 when payload parsing fails", async () => {
    serviceMocks.parseHelpSearchPayload.mockReturnValueOnce({ ok: false, error: "q is required" });
    const res = mockRes();

    await searchHelpHandler({ body: {} } as any, res);

    expect(serviceMocks.searchHelpRecords).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "q is required" });
  });

  it("returns search results when payload is valid", async () => {
    serviceMocks.parseHelpSearchPayload.mockReturnValueOnce({
      ok: true,
      value: { q: "meetings", scope: "faqs", records: [], limit: 5 },
    });
    serviceMocks.searchHelpRecords.mockReturnValueOnce([{ id: "faq-1" }]);
    const res = mockRes();

    await searchHelpHandler({ body: { q: "meetings" } } as any, res);

    expect(serviceMocks.searchHelpRecords).toHaveBeenCalledWith({
      q: "meetings",
      scope: "faqs",
      records: [],
      limit: 5,
    });
    expect(res.json).toHaveBeenCalledWith({ items: [{ id: "faq-1" }] });
  });
});
