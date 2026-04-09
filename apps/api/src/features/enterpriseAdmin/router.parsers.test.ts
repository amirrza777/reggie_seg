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

  it("parses full meeting settings body", () => {
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: "2",
        minutesEditWindowDays: 5,
        attendanceEditWindowDays: 7,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: false,
        allowAnyoneToWriteMinutes: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        absenceThreshold: 2,
        minutesEditWindowDays: 5,
        attendanceEditWindowDays: 7,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: false,
        allowAnyoneToWriteMinutes: true,
      },
    });
  });

  it("rejects invalid meeting absence threshold", () => {
    expect(parseMeetingSettingsBody({ absenceThreshold: 0 })).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
    expect(parseMeetingSettingsBody({ minutesEditWindowDays: 3 })).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
    expect(parseMeetingSettingsBody("bad")).toEqual({
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
    expect(parseMeetingSettingsBody({ absenceThreshold: 2, minutesEditWindowDays: 3, attendanceEditWindowDays: 0 })).toEqual({
      ok: false,
      error: "attendanceEditWindowDays must be a positive integer",
    });
  });

  it("rejects missing meeting settings booleans", () => {
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: 2,
        minutesEditWindowDays: 3,
        attendanceEditWindowDays: 4,
      }),
    ).toEqual({
      ok: false,
      error: "allowAnyoneToEditMeetings must be a boolean",
    });
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: 2,
        minutesEditWindowDays: 3,
        attendanceEditWindowDays: 4,
        allowAnyoneToEditMeetings: true,
      }),
    ).toEqual({
      ok: false,
      error: "allowAnyoneToRecordAttendance must be a boolean",
    });
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: 2,
        minutesEditWindowDays: 3,
        attendanceEditWindowDays: 4,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: false,
      }),
    ).toEqual({
      ok: false,
      error: "allowAnyoneToWriteMinutes must be a boolean",
    });
  });

  it("rejects non-boolean toggles and non-object body", () => {
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: 2,
        minutesEditWindowDays: 3,
        attendanceEditWindowDays: 4,
        allowAnyoneToEditMeetings: "true",
        allowAnyoneToRecordAttendance: false,
        allowAnyoneToWriteMinutes: false,
      }),
    ).toEqual({
      ok: false,
      error: "allowAnyoneToEditMeetings must be a boolean",
    });
    expect(
      parseMeetingSettingsBody({
        absenceThreshold: 2,
        minutesEditWindowDays: 3,
        attendanceEditWindowDays: 4,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: 1,
        allowAnyoneToWriteMinutes: false,
      }),
    ).toEqual({
      ok: false,
      error: "allowAnyoneToRecordAttendance must be a boolean",
    });
    expect(parseMeetingSettingsBody(null)).toEqual({
      ok: false,
      error: "absenceThreshold must be a positive integer",
    });
  });
});
