import { describe, expect, it } from "vitest";
import {
  parseAcceptEnterpriseAdminInviteBody,
  parseConfirmEmailChangeBody,
  parseDeleteAccountBody,
  parseForgotPasswordBody,
  parseJoinEnterpriseBody,
  parseLoginBody,
  parseRefreshTokenBody,
  parseRequestEmailChangeBody,
  parseResetPasswordBody,
  parseSignupBody,
  parseUpdateProfileBody,
} from "./controller.parsers.js";

describe("auth controller parsers", () => {
  it("parses signup payloads and ignores role input", () => {
    expect(
      parseSignupBody({
        enterpriseCode: " ENT ",
        email: " User@Example.com ",
        password: " secret ",
        firstName: " Ada ",
        lastName: " Lovelace ",
        role: "ADMIN",
      }),
    ).toEqual({
      ok: true,
      value: {
        enterpriseCode: "ENT",
        email: "User@Example.com",
        password: "secret",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    });
  });

  it("rejects invalid required signup fields", () => {
    expect(parseSignupBody({})).toEqual({ ok: false, error: "Enterprise code, email and password are required" });
  });

  it("parses login and token payloads", () => {
    expect(parseLoginBody({ email: " a@b.com ", password: " pw " })).toEqual({
      ok: true,
      value: { email: "a@b.com", password: "pw" },
    });
    expect(parseRefreshTokenBody({ refreshToken: " rt " })).toEqual({
      ok: true,
      value: { refreshToken: "rt" },
    });
    expect(parseRefreshTokenBody(undefined)).toEqual({ ok: true, value: {} });
  });

  it("parses reset and email change payloads", () => {
    expect(parseForgotPasswordBody({ email: " reset@example.com " })).toEqual({
      ok: true,
      value: { email: "reset@example.com" },
    });
    expect(parseResetPasswordBody({ token: " token ", newPassword: " next " })).toEqual({
      ok: true,
      value: { token: "token", newPassword: "next" },
    });
    expect(parseRequestEmailChangeBody({ newEmail: " next@example.com " })).toEqual({
      ok: true,
      value: { newEmail: "next@example.com" },
    });
    expect(parseConfirmEmailChangeBody({ newEmail: " next@example.com ", code: " 1234 " })).toEqual({
      ok: true,
      value: { newEmail: "next@example.com", code: "1234" },
    });
  });

  it("parses enterprise-admin invite accept payload", () => {
    expect(parseAcceptEnterpriseAdminInviteBody({ token: " abc ", firstName: " Ada ", lastName: " Lovelace " })).toEqual({
      ok: true,
      value: { token: "abc", firstName: "Ada", lastName: "Lovelace" },
    });
    expect(parseAcceptEnterpriseAdminInviteBody({})).toEqual({
      ok: false,
      error: "token required",
    });
  });

  it("parses update profile payloads and rejects malformed values", () => {
    expect(parseUpdateProfileBody(undefined)).toEqual({ ok: true, value: {} });
    expect(
      parseUpdateProfileBody({
        firstName: " Ada ",
        lastName: " Lovelace ",
        avatarBase64: " abc ",
        avatarMime: " image/png ",
      }),
    ).toEqual({
      ok: true,
      value: {
        firstName: "Ada",
        lastName: "Lovelace",
        avatarBase64: "abc",
        avatarMime: "image/png",
      },
    });
    expect(parseUpdateProfileBody({ avatarMime: 42 })).toEqual({ ok: false, error: "Invalid avatarMime" });
  });

  it("parses delete account payload and validates password", () => {
    expect(parseDeleteAccountBody({ password: " secret " })).toEqual({
      ok: true,
      value: { password: "secret" },
    });
    expect(parseDeleteAccountBody({})).toEqual({
      ok: false,
      error: "password required",
    });
  });

  it("parses enterprise join payload and validates enterpriseCode", () => {
    expect(parseJoinEnterpriseBody({ enterpriseCode: " ent " })).toEqual({
      ok: true,
      value: { enterpriseCode: "ent" },
    });
    expect(parseJoinEnterpriseBody({})).toEqual({
      ok: false,
      error: "enterpriseCode required",
    });
  });
});
