import { describe, expect, it } from "vitest";
import {
  parseConfirmEmailChangeBody,
  parseForgotPasswordBody,
  parseLoginBody,
  parseRefreshTokenBody,
  parseRequestEmailChangeBody,
  parseResetPasswordBody,
  parseSignupBody,
  parseUpdateProfileBody,
} from "./controller.parsers.js";

describe("auth controller parsers", () => {
  it("parses signup payloads with normalized role", () => {
    expect(
      parseSignupBody({
        enterpriseCode: " ENT ",
        email: " User@Example.com ",
        password: " secret ",
        firstName: " Ada ",
        lastName: " Lovelace ",
        role: "staff",
      }),
    ).toEqual({
      ok: true,
      value: {
        enterpriseCode: "ENT",
        email: "User@Example.com",
        password: "secret",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "STAFF",
      },
    });
  });

  it("rejects invalid signup payloads", () => {
    expect(parseSignupBody({})).toEqual({ ok: false, error: "Enterprise code, email and password are required" });
    expect(parseSignupBody({ enterpriseCode: "ENT", email: "a@b.com", password: "pw", role: "ADMIN" })).toEqual({
      ok: false,
      error: "Invalid role",
    });
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
});
