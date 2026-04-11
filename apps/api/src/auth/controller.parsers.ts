import {
  fail,
  ok,
  parseOptionalTrimmedString,
  parseTrimmedString,
  type ParseResult,
} from "../shared/parse.js";

type SignupBody = {
  enterpriseCode: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};
type UpdateProfileBody = {
  firstName?: string;
  lastName?: string;
  avatarBase64?: string;
  avatarMime?: string;
};
type AcceptEnterpriseAdminInviteBody = {
  token: string;
  newPassword: string;
  firstName?: string;
  lastName?: string;
};
type DeleteAccountBody = {
  password: string;
};
type JoinEnterpriseBody = {
  enterpriseCode: string;
};
type OptionalFieldSpec<TKey extends string> = { key: TKey; error: string };

const signupOptionalFieldSpecs = [
  { key: "firstName", error: "Invalid firstName" },
  { key: "lastName", error: "Invalid lastName" },
] as const;

const updateProfileOptionalFieldSpecs = [
  { key: "firstName", error: "Invalid firstName" },
  { key: "lastName", error: "Invalid lastName" },
  { key: "avatarBase64", error: "Invalid avatarBase64" },
  { key: "avatarMime", error: "Invalid avatarMime" },
] as const;

function parseBodyRecord(body: unknown, error = "Invalid request body"): ParseResult<Record<string, unknown>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(error);
  }
  return ok(body as Record<string, unknown>);
}

function parseRequiredSignupFields(body: Record<string, unknown>): ParseResult<Pick<SignupBody, "enterpriseCode" | "email" | "password">> {
  const enterpriseCode = parseTrimmedString(body.enterpriseCode, "enterpriseCode");
  const email = parseTrimmedString(body.email, "email");
  const password = parseTrimmedString(body.password, "password");
  if (!enterpriseCode.ok || !email.ok || !password.ok) {
    return fail("Enterprise code, email and password are required");
  }
  return ok({ enterpriseCode: enterpriseCode.value, email: email.value, password: password.value });
}

function parseOptionalFields<TKey extends string>(
  body: Record<string, unknown>,
  fieldSpecs: readonly OptionalFieldSpec<TKey>[],
): ParseResult<Partial<Record<TKey, string>>> {
  const parsed: Partial<Record<TKey, string>> = {};
  for (const fieldSpec of fieldSpecs) {
    const value = parseOptionalTrimmedString(body[fieldSpec.key], fieldSpec.key);
    if (!value.ok) {
      return fail(fieldSpec.error);
    }
    if (value.value !== undefined) {
      parsed[fieldSpec.key] = value.value;
    }
  }
  return ok(parsed);
}

export function parseSignupBody(body: unknown): ParseResult<SignupBody> {
  const parsedBody = parseBodyRecord(body, "Enterprise code, email and password are required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const required = parseRequiredSignupFields(parsedBody.value);
  if (!required.ok) {
    return required;
  }
  const optionalFields = parseOptionalFields(parsedBody.value, signupOptionalFieldSpecs);
  if (!optionalFields.ok) {
    return optionalFields;
  }

  return ok({
    ...required.value,
    ...optionalFields.value,
  });
}

export function parseLoginBody(body: unknown): ParseResult<{ email: string; password: string }> {
  const parsedBody = parseBodyRecord(body, "Email and Password required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

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
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const refreshToken = parseOptionalTrimmedString(parsedBody.value.refreshToken, "refreshToken");
  if (!refreshToken.ok) {
    return fail("Invalid refresh token");
  }

  return ok(refreshToken.value ? { refreshToken: refreshToken.value } : {});
}

export function parseForgotPasswordBody(body: unknown): ParseResult<{ email: string }> {
  const parsedBody = parseBodyRecord(body, "Email required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const email = parseTrimmedString(parsedBody.value.email, "email");
  if (!email.ok) {
    return fail("Email required");
  }

  return ok({ email: email.value });
}

export function parseResetPasswordBody(body: unknown): ParseResult<{ token: string; newPassword: string }> {
  const parsedBody = parseBodyRecord(body, "Token and newPassword required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const token = parseTrimmedString(parsedBody.value.token, "token");
  const newPassword = parseTrimmedString(parsedBody.value.newPassword, "newPassword");
  if (!token.ok || !newPassword.ok) {
    return fail("Token and newPassword required");
  }

  return ok({ token: token.value, newPassword: newPassword.value });
}

export function parseUpdateProfileBody(body: unknown): ParseResult<UpdateProfileBody> {
  if (body === undefined || body === null) {
    return ok({});
  }
  const parsedBody = parseBodyRecord(body);
  if (!parsedBody.ok) {
    return parsedBody;
  }
  const optionalFields = parseOptionalFields(parsedBody.value, updateProfileOptionalFieldSpecs);
  if (!optionalFields.ok) {
    return optionalFields;
  }
  return ok(optionalFields.value);
}

export function parseRequestEmailChangeBody(body: unknown): ParseResult<{ newEmail: string }> {
  const parsedBody = parseBodyRecord(body, "newEmail required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const newEmail = parseTrimmedString(parsedBody.value.newEmail, "newEmail");
  if (!newEmail.ok) {
    return fail("newEmail required");
  }

  return ok({ newEmail: newEmail.value });
}

export function parseConfirmEmailChangeBody(body: unknown): ParseResult<{ newEmail: string; code: string }> {
  const parsedBody = parseBodyRecord(body, "newEmail and code required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const newEmail = parseTrimmedString(parsedBody.value.newEmail, "newEmail");
  const code = parseTrimmedString(parsedBody.value.code, "code");
  if (!newEmail.ok || !code.ok) {
    return fail("newEmail and code required");
  }

  return ok({ newEmail: newEmail.value, code: code.value });
}

export function parseDeleteAccountBody(body: unknown): ParseResult<DeleteAccountBody> {
  const parsedBody = parseBodyRecord(body, "password required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const password = parseTrimmedString(parsedBody.value.password, "password");
  if (!password.ok) {
    return fail("password required");
  }

  return ok({ password: password.value });
}

export function parseJoinEnterpriseBody(body: unknown): ParseResult<JoinEnterpriseBody> {
  const parsedBody = parseBodyRecord(body, "enterpriseCode required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const enterpriseCode = parseTrimmedString(parsedBody.value.enterpriseCode, "enterpriseCode");
  if (!enterpriseCode.ok) {
    return fail("enterpriseCode required");
  }

  return ok({ enterpriseCode: enterpriseCode.value });
}

export function parseAcceptEnterpriseAdminInviteBody(body: unknown): ParseResult<AcceptEnterpriseAdminInviteBody> {
  const parsedBody = parseBodyRecord(body, "token and newPassword required");
  if (!parsedBody.ok) {
    return parsedBody;
  }

  const token = parseTrimmedString(parsedBody.value.token, "token");
  const newPassword = parseTrimmedString(parsedBody.value.newPassword, "newPassword");
  if (!token.ok || !newPassword.ok) {
    return fail("token and newPassword required");
  }

  const firstName = parseOptionalTrimmedString(parsedBody.value.firstName, "firstName");
  if (!firstName.ok) {
    return fail("Invalid firstName");
  }
  const lastName = parseOptionalTrimmedString(parsedBody.value.lastName, "lastName");
  if (!lastName.ok) {
    return fail("Invalid lastName");
  }

  return ok({
    token: token.value,
    newPassword: newPassword.value,
    ...(firstName.value !== undefined ? { firstName: firstName.value } : {}),
    ...(lastName.value !== undefined ? { lastName: lastName.value } : {}),
  });
}
