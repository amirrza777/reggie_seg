import { describe, expect, it } from "vitest";
import {
  parseEnterpriseUserCreateBody,
  parseEnterpriseUserUpdateBody,
  parseFeatureFlagUpdateBody,
  parseMeetingSettingsBody,
} from "./router.parsers.js";

const validMeetingSettingsBody = {
  absenceThreshold: 2,
  minutesEditWindowDays: 5,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: true,
  allowAnyoneToRecordAttendance: false,
  allowAnyoneToWriteMinutes: true,
};

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

  describe("parseMeetingSettingsBody", () => {
    it("parses full six-field meeting settings body", () => {
      expect(
        parseMeetingSettingsBody({
          ...validMeetingSettingsBody,
          absenceThreshold: "2",
          attendanceEditWindowDays: "7",
        }),
      ).toEqual({
        ok: true,
        value: validMeetingSettingsBody,
      });
    });

    it("rejects invalid numeric fields", () => {
      const cases: Array<{ body: unknown; error: string }> = [
        { body: { ...validMeetingSettingsBody, absenceThreshold: 0 }, error: "absenceThreshold must be a positive integer" },
        {
          body: { ...validMeetingSettingsBody, absenceThreshold: 2.5 },
          error: "absenceThreshold must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, absenceThreshold: undefined },
          error: "absenceThreshold must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, minutesEditWindowDays: 0 },
          error: "minutesEditWindowDays must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, minutesEditWindowDays: 1.1 },
          error: "minutesEditWindowDays must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, minutesEditWindowDays: undefined },
          error: "minutesEditWindowDays must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, attendanceEditWindowDays: 0 },
          error: "attendanceEditWindowDays must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, attendanceEditWindowDays: 3.2 },
          error: "attendanceEditWindowDays must be a positive integer",
        },
        {
          body: { ...validMeetingSettingsBody, attendanceEditWindowDays: undefined },
          error: "attendanceEditWindowDays must be a positive integer",
        },
      ];

      for (const testCase of cases) {
        expect(parseMeetingSettingsBody(testCase.body)).toEqual({ ok: false, error: testCase.error });
      }
    });

    it("rejects missing or invalid boolean fields", () => {
      const cases: Array<{ body: unknown; error: string }> = [
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToEditMeetings: undefined },
          error: "allowAnyoneToEditMeetings must be a boolean",
        },
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToEditMeetings: "true" },
          error: "allowAnyoneToEditMeetings must be a boolean",
        },
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToRecordAttendance: undefined },
          error: "allowAnyoneToRecordAttendance must be a boolean",
        },
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToRecordAttendance: 1 },
          error: "allowAnyoneToRecordAttendance must be a boolean",
        },
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToWriteMinutes: undefined },
          error: "allowAnyoneToWriteMinutes must be a boolean",
        },
        {
          body: { ...validMeetingSettingsBody, allowAnyoneToWriteMinutes: null },
          error: "allowAnyoneToWriteMinutes must be a boolean",
        },
      ];

      for (const testCase of cases) {
        expect(parseMeetingSettingsBody(testCase.body)).toEqual({ ok: false, error: testCase.error });
      }
    });

    it("rejects invalid body shape", () => {
      const cases = [null, "bad", 123, []];
      for (const body of cases) {
        expect(parseMeetingSettingsBody(body)).toEqual({
          ok: false,
          error: "absenceThreshold must be a positive integer",
        });
      }
    });

    it("regression: rejects payload that omits booleans", () => {
      expect(
        parseMeetingSettingsBody({
          absenceThreshold: 2,
          minutesEditWindowDays: 5,
          attendanceEditWindowDays: 7,
        }),
      ).toEqual({
        ok: false,
        error: "allowAnyoneToEditMeetings must be a boolean",
      });
    });

    it("regression: accepts modern six-field payload", () => {
      expect(parseMeetingSettingsBody(validMeetingSettingsBody)).toEqual({
        ok: true,
        value: validMeetingSettingsBody,
      });
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
