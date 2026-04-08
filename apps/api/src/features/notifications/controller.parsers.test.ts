import { describe, expect, it } from "vitest";
import {
  parseNotificationActionBody,
  parseNotificationIdParam,
  parseNotificationUserIdQuery,
} from "./controller.parsers.js";

describe("notifications controller parsers", () => {
  it("parses user ids and notification ids", () => {
    expect(parseNotificationUserIdQuery("5")).toEqual({ ok: true, value: 5 });
    expect(parseNotificationIdParam("7")).toEqual({ ok: true, value: 7 });
  });

  it("parses notification action bodies", () => {
    expect(parseNotificationActionBody({ userId: "3" })).toEqual({ ok: true, value: { userId: 3 } });
    expect(parseNotificationActionBody({})).toEqual({ ok: false, error: "Missing required field: userId" });
  });

  it("rejects non-object action bodies", () => {
    expect(parseNotificationActionBody(null)).toEqual({ ok: false, error: "Missing required field: userId" });
    expect(parseNotificationActionBody("string")).toEqual({ ok: false, error: "Missing required field: userId" });
    expect(parseNotificationActionBody([{ userId: 3 }])).toEqual({ ok: false, error: "Missing required field: userId" });
  });
});
