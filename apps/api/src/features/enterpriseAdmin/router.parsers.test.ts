import { describe, expect, it } from "vitest";
import {
  parseEnterpriseUserCreateBody,
  parseEnterpriseUserUpdateBody,
  parseFeatureFlagUpdateBody,
  parseMeetingSettingsBody,
} from "./router.parsers.js";

describe("enterpriseAdmin router parsers", () => {
  it("parses feature flag update body", () => {
    expect(parseFeatureFlagUpdateBody({ enabled: true })).toEqual({
      ok: true,
      value: { enabled: true },
    });
  });

  it("rejects feature flag update body without enabled boolean", () => {
    expect(parseFeatureFlagUpdateBody({})).toEqual({ ok: false, error: "enabled boolean required" });
    expect(parseFeatureFlagUpdateBody({ enabled: "true" })).toEqual({
      ok: false,
      error: "enabled boolean required",
    });
    expect(parseFeatureFlagUpdateBody(null)).toEqual({ ok: false, error: "enabled boolean required" });
  });

  it("parses meeting settings body", () => {
    expect(parseMeetingSettingsBody({ absenceThreshold: "2", minutesEditWindowDays: 5 })).toEqual({
      ok: true,
      value: { absenceThreshold: 2, minutesEditWindowDays: 5 },
    });
  });

  it("rejects invalid meeting absence threshold", () => {
    expect(parseMeetingSettingsBody({ absenceThreshold: 0, minutesEditWindowDays: 3 })).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
    expect(parseMeetingSettingsBody({ minutesEditWindowDays: 3 })).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
    expect(parseMeetingSettingsBody(null)).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
  });

  it("rejects invalid meeting edit window days", () => {
    expect(parseMeetingSettingsBody({ absenceThreshold: 2, minutesEditWindowDays: 0 })).toEqual({
      ok: false,
      error: "minutesEditWindowDays must be a positive integer",
    });
    expect(parseMeetingSettingsBody({ absenceThreshold: 2 })).toEqual({
      ok: false,
      error: "minutesEditWindowDays must be a positive integer",
    });
  });

  it("parses enterprise user update body", () => {
    expect(parseEnterpriseUserUpdateBody({ role: "staff", active: false })).toEqual({
      ok: true,
      value: { role: "STAFF", active: false },
    });
  });

  it("rejects invalid enterprise user update body", () => {
    expect(parseEnterpriseUserUpdateBody({ role: "ENTERPRISE_ADMIN" })).toEqual({
      ok: false,
      error: "role must be STUDENT or STAFF",
    });
    expect(parseEnterpriseUserUpdateBody({ active: "false" })).toEqual({
      ok: false,
      error: "active must be a boolean",
    });
  });

  it("parses enterprise user create body with normalized values", () => {
    expect(
      parseEnterpriseUserCreateBody({
        email: "  USER@Example.com ",
        firstName: "  First ",
        lastName: " Last  ",
        role: "staff",
      }),
    ).toEqual({
      ok: true,
      value: {
        email: "user@example.com",
        firstName: "First",
        lastName: "Last",
        role: "STAFF",
      },
    });
  });

  it("rejects invalid enterprise user create payload values", () => {
    expect(parseEnterpriseUserCreateBody({})).toEqual({ ok: false, error: "email is required" });
    expect(parseEnterpriseUserCreateBody({ email: "bad-email" })).toEqual({
      ok: false,
      error: "email must be a valid email address",
    });
    expect(parseEnterpriseUserCreateBody({ email: "ok@example.com", firstName: 10 })).toEqual({
      ok: false,
      error: "firstName must be a string",
    });
    expect(parseEnterpriseUserCreateBody({ email: "ok@example.com", lastName: 10 })).toEqual({
      ok: false,
      error: "lastName must be a string",
    });
    expect(parseEnterpriseUserCreateBody({ email: "ok@example.com", role: "ENTERPRISE_ADMIN" })).toEqual({
      ok: false,
      error: "role must be STUDENT or STAFF",
    });
    expect(parseEnterpriseUserCreateBody({ email: "ok@example.com", role: 99 })).toEqual({
      ok: false,
      error: "role must be STUDENT or STAFF",
    });
  });
});
