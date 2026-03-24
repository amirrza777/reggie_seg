import {
  fail,
  ok,
  parseOptionalTrimmedString,
  parseTrimmedString,
  type ParseResult,
} from "../shared/parse.js";

const signupRoles = ["STUDENT", "STAFF", "ENTERPRISE_ADMIN"] as const;

type SignupRole = (typeof signupRoles)[number];

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

export function parseSignupBody(body: unknown): ParseResult<{
  enterpriseCode: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: SignupRole;
}> {
  const parsedBody = parseBodyRecord(body, "Enterprise code, email and password are required");
  if (!parsedBody.ok) return parsedBody;

  const enterpriseCode = parseTrimmedString(parsedBody.value.enterpriseCode, "enterpriseCode");
  const email = parseTrimmedString(parsedBody.value.email, "email");
  const password = parseTrimmedString(parsedBody.value.password, "password");
  if (!enterpriseCode.ok || !email.ok || !password.ok) {
    return fail("Enterprise code, email and password are required");
  }

  const firstName = parseOptionalTrimmedString(parsedBody.value.firstName, "firstName");
  if (!firstName.ok) return fail("Invalid firstName");

  const lastName = parseOptionalTrimmedString(parsedBody.value.lastName, "lastName");
  if (!lastName.ok) return fail("Invalid lastName");

  const rawRole = parsedBody.value.role;
  let role: SignupRole | undefined;
  if (rawRole !== undefined) {
    if (typeof rawRole !== "string") {
      return fail("Invalid role");
    }
    const normalizedRole = rawRole.trim().toUpperCase();
    if (!signupRoles.includes(normalizedRole as SignupRole)) {
      return fail("Invalid role");
    }
    role = normalizedRole as SignupRole;
  }

  return ok({
    enterpriseCode: enterpriseCode.value,
    email: email.value,
    password: password.value,
    ...(firstName.value !== undefined ? { firstName: firstName.value } : {}),
    ...(lastName.value !== undefined ? { lastName: lastName.value } : {}),
    ...(role ? { role } : {}),
  });
}

export function parseLoginBody(body: unknown): ParseResult<{ email: string; password: string }> {
  const parsedBody = parseBodyRecord(body, "Email and Password required");
  if (!parsedBody.ok) return parsedBody;

  const email = parseTrimmedString(parsedBody.value.email, "email");
  const password = parseTrimmedString(parsedBody.value.password, "password");
  if (!email.ok || !password.ok) {
    return fail("Email and Password required");
  }

  return ok({ email: email.value, password: password.value });
}

export function parseRefreshTokenBody(body: unknown): ParseResult<{ refreshToken?: string }> {
  if (body === undefined || body === null) {
    return ok({});
  }
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const refreshToken = parseOptionalTrimmedString(parsedBody.value.refreshToken, "refreshToken");
  if (!refreshToken.ok) return fail("Invalid refresh token");

  return ok(refreshToken.value ? { refreshToken: refreshToken.value } : {});
}

export function parseForgotPasswordBody(body: unknown): ParseResult<{ email: string }> {
  const parsedBody = parseBodyRecord(body, "Email required");
  if (!parsedBody.ok) return parsedBody;

  const email = parseTrimmedString(parsedBody.value.email, "email");
  if (!email.ok) return fail("Email required");

  return ok({ email: email.value });
}

export function parseResetPasswordBody(body: unknown): ParseResult<{ token: string; newPassword: string }> {
  const parsedBody = parseBodyRecord(body, "Token and newPassword required");
  if (!parsedBody.ok) return parsedBody;

  const token = parseTrimmedString(parsedBody.value.token, "token");
  const newPassword = parseTrimmedString(parsedBody.value.newPassword, "newPassword");
  if (!token.ok || !newPassword.ok) {
    return fail("Token and newPassword required");
  }

  return ok({ token: token.value, newPassword: newPassword.value });
}

export function parseUpdateProfileBody(body: unknown): ParseResult<{
  firstName?: string;
  lastName?: string;
  avatarBase64?: string;
  avatarMime?: string;
}> {
  if (body === undefined || body === null) {
    return ok({});
  }
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) return parsedBody;

  const firstName = parseOptionalTrimmedString(parsedBody.value.firstName, "firstName");
  if (!firstName.ok) return fail("Invalid firstName");

  const lastName = parseOptionalTrimmedString(parsedBody.value.lastName, "lastName");
  if (!lastName.ok) return fail("Invalid lastName");

  const avatarBase64 = parseOptionalTrimmedString(parsedBody.value.avatarBase64, "avatarBase64");
  if (!avatarBase64.ok) return fail("Invalid avatarBase64");

  const avatarMime = parseOptionalTrimmedString(parsedBody.value.avatarMime, "avatarMime");
  if (!avatarMime.ok) return fail("Invalid avatarMime");

  return ok({
    ...(firstName.value !== undefined ? { firstName: firstName.value } : {}),
    ...(lastName.value !== undefined ? { lastName: lastName.value } : {}),
    ...(avatarBase64.value !== undefined ? { avatarBase64: avatarBase64.value } : {}),
    ...(avatarMime.value !== undefined ? { avatarMime: avatarMime.value } : {}),
  });
}

export function parseRequestEmailChangeBody(body: unknown): ParseResult<{ newEmail: string }> {
  const parsedBody = parseBodyRecord(body, "newEmail required");
  if (!parsedBody.ok) return parsedBody;

  const newEmail = parseTrimmedString(parsedBody.value.newEmail, "newEmail");
  if (!newEmail.ok) return fail("newEmail required");

  return ok({ newEmail: newEmail.value });
}

export function parseConfirmEmailChangeBody(body: unknown): ParseResult<{ newEmail: string; code: string }> {
  const parsedBody = parseBodyRecord(body, "newEmail and code required");
  if (!parsedBody.ok) return parsedBody;

  const newEmail = parseTrimmedString(parsedBody.value.newEmail, "newEmail");
  const code = parseTrimmedString(parsedBody.value.code, "code");
  if (!newEmail.ok || !code.ok) {
    return fail("newEmail and code required");
  }

  return ok({ newEmail: newEmail.value, code: code.value });
}
