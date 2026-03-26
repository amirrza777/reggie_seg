import { describe, expect, it } from "vitest";
import {
  parseAdminEnterpriseIdParam,
  parseAuditLogsQuery,
  parseAdminUserIdParam,
  parseCreateEnterpriseBody,
  parseUpdateUserBody,
  parseUpdateUserRoleBody,
} from "./controller.parsers.js";

describe("admin controller parsers", () => {
  it("parses user and enterprise route params", () => {
    expect(parseAdminUserIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseAdminEnterpriseIdParam("ent-1")).toEqual({ ok: true, value: "ent-1" });
  });

  it("parses role updates", () => {
    expect(parseUpdateUserRoleBody({ role: "staff" })).toEqual({ ok: true, value: "STAFF" });
    expect(parseUpdateUserRoleBody({ role: "bad" })).toEqual({ ok: false, error: "Invalid role" });
  });

  it("parses enterprise creation body", () => {
    expect(parseCreateEnterpriseBody({ name: "King's", code: "kcl" })).toEqual({
      ok: true,
      value: { name: "King's", code: "kcl" },
    });
  });

  it("parses user updates", () => {
    expect(parseUpdateUserBody({ active: true, role: "admin" })).toEqual({
      ok: true,
      value: { active: true, role: "ADMIN" },
    });
  });

  it("parses audit log query filters", () => {
    expect(parseAuditLogsQuery({ from: "bad", to: "2026-03-02", limit: "5" })).toEqual({
      ok: true,
      value: { to: new Date("2026-03-02"), limit: 5 },
    });
  });
});
