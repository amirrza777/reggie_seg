import { describe, expect, it } from "vitest";
import { parseFeatureFlagUpdateBody, parseMeetingSettingsBody } from "./router.parsers.js";

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
});
