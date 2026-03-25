import { describe, expect, it } from "vitest";
import { parseCalendarUserIdQuery } from "./controller.parsers.js";

describe("calendar controller parsers", () => {
  it("parses valid user ids and rejects invalid ones", () => {
    expect(parseCalendarUserIdQuery("7")).toEqual({ ok: true, value: 7 });
    expect(parseCalendarUserIdQuery("abc")).toEqual({ ok: false, error: "Invalid user ID" });
  });
});
