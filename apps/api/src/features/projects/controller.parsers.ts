import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  parseBoolean,
  parseOptionalIsoDate,
  parseOptionalTrimmedString,
  parseEnum,
  parseOptionalPositiveInt,
  parsePositiveInt,
  parsePositiveIntArray,
  parseTrimmedString,
  type ParseResult,
} from "../../shared/parse.js";
import { parseProjectDeadline, parseStudentDeadlineOverridePayload, type ParsedProjectDeadline } from "./controller.deadline-parsers.js";

export function parseAuthenticatedUserId(req: AuthRequest): ParseResult<number> {
  const authUserId = req.user?.sub;
  if (!authUserId) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, value: authUserId };
}

export function parseAuthenticatedQueryUserId(req: AuthRequest): ParseResult<number> {
  const authUserId = parseAuthenticatedUserId(req);
  if (!authUserId.ok) return authUserId;

  if (req.query.userId === undefined) {
    return authUserId;
  }

  const parsedQueryUserId = parsePositiveInt(req.query.userId, "userId");
  if (!parsedQueryUserId.ok) {
    return { ok: false, error: "Invalid user ID" };
  }
  if (parsedQueryUserId.value !== authUserId.value) {
    return { ok: false, error: "Forbidden" };
  }

  return authUserId;
}

export function parseProjectIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "projectId");
  if (!parsed.ok) return { ok: false, error: "Invalid project ID" };
  return parsed;
}

export function parseTeamIdParam(value: unknown): ParseResult<number> {
  const parsed = parsePositiveInt(value, "teamId");
  if (!parsed.ok) return { ok: false, error: "Invalid team ID" };
  return parsed;
}

export function parseCreateProjectBody(body: unknown): ParseResult<{
  name: string;
  moduleId: number;
  questionnaireTemplateId: number;
  deadline: ParsedProjectDeadline;
  studentIds?: number[];
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const name = parseTrimmedString(raw.name, "Project name", { maxLength: 160 });
  if (!name.ok) {
    return { ok: false, error: name.error === "Project name is required" ? "Project name is required and must be a string" : name.error };
  }

  const moduleId = parsePositiveInt(raw.moduleId, "moduleId");
  const questionnaireTemplateId = parsePositiveInt(raw.questionnaireTemplateId, "questionnaireTemplateId");
  if (!moduleId.ok || !questionnaireTemplateId.ok) {
    return { ok: false, error: "moduleId and questionnaireTemplateId must be positive integers" };
  }

  const deadline = parseProjectDeadline(raw.deadline);
  if (!deadline.ok) return deadline;

  let studentIds: number[] | undefined;
  if (raw.studentIds !== undefined) {
    const parsedStudentIds = parsePositiveIntArray(raw.studentIds, "studentIds");
    if (!parsedStudentIds.ok) {
      return { ok: false, error: parsedStudentIds.error };
    }
    studentIds = parsedStudentIds.value;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      moduleId: moduleId.value,
      questionnaireTemplateId: questionnaireTemplateId.value,
      deadline: deadline.value,
      ...(studentIds !== undefined ? { studentIds } : {}),
    },
  };
}

export function parseModulesListQuery(query: unknown): ParseResult<{
  staffOnly: boolean;
  compact: boolean;
  query?: string | null;
}> {
  const raw = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};
  const parsedSearchQuery = parseSearchQuery(raw.q);
  if (!parsedSearchQuery.ok) return parsedSearchQuery;

  return {
    ok: true,
    value: {
      staffOnly: raw.scope === "staff",
      compact: raw.compact === "1",
      ...(parsedSearchQuery.value ? { query: parsedSearchQuery.value } : {}),
    },
  };
}

export function parseJoinModuleBody(body: unknown): ParseResult<{ code: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const code = parseTrimmedString(raw.code, "code");
  if (!code.ok) return { ok: false, error: "code is required" };
  return { ok: true, value: { code: code.value } };
}

export function parseTeamHealthMessageBody(body: unknown): ParseResult<{ userId: number; subject: string; details: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const userId = parsePositiveInt(raw.userId, "userId");
  if (!userId.ok) return { ok: false, error: "Invalid user ID or project ID" };

  const subject = parseTrimmedString(raw.subject, "subject");
  const details = parseTrimmedString(raw.details, "details");
  if (!subject.ok || !details.ok) {
    if ((raw.subject !== undefined && typeof raw.subject !== "string") || (raw.details !== undefined && typeof raw.details !== "string")) {
      return { ok: false, error: "subject and details are required strings" };
    }
    return { ok: false, error: "subject and details cannot be empty" };
  }

  return { ok: true, value: { userId: userId.value, subject: subject.value, details: details.value } };
}

export function parseDeadlineProfileBody(body: unknown): ParseResult<"STANDARD" | "MCF"> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const parsed = parseEnum(raw.deadlineProfile, "deadlineProfile", ["STANDARD", "MCF"] as const);
  if (!parsed.ok) {
    return { ok: false, error: "deadlineProfile must be STANDARD or MCF" };
  }
  return parsed;
}

export function parseStaffStudentOverrideRoute(
  req: AuthRequest,
): ParseResult<{ actorUserId: number; projectId: number; studentId: number }> {
  const actorUserId = parseAuthenticatedUserId(req);
  if (!actorUserId.ok) return actorUserId;

  const projectId = parseProjectIdParam(req.params.projectId);
  const studentId = parsePositiveInt(req.params.studentId, "studentId");
  if (!projectId.ok || !studentId.ok) {
    return { ok: false, error: "Invalid project ID or student ID" };
  }

  return {
    ok: true,
    value: {
      actorUserId: actorUserId.value,
      projectId: projectId.value,
      studentId: studentId.value,
    },
  };
}

export function parseStudentDeadlineOverrideBody(body: unknown) {
  return parseStudentDeadlineOverridePayload(body);
}

export function parseProjectAndUserQuery(req: AuthRequest): ParseResult<{ projectId: number; userId: number }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const userId = parseOptionalPositiveInt(req.query.userId, "userId");
  if (!projectId.ok || !userId.ok || userId.value === undefined) {
    return { ok: false, error: "Invalid user ID or project ID" };
  }
  return { ok: true, value: { projectId: projectId.value, userId: userId.value } };
}

export function parseProjectTeamAndUserQuery(
  req: AuthRequest,
): ParseResult<{ projectId: number; teamId: number; userId: number }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const teamId = parseTeamIdParam(req.params.teamId);
  const userId = parseOptionalPositiveInt(req.query.userId, "userId");
  if (!projectId.ok || !teamId.ok || !userId.ok || userId.value === undefined) {
    return { ok: false, error: "Invalid user ID, project ID, or team ID" };
  }
  return { ok: true, value: { projectId: projectId.value, teamId: teamId.value, userId: userId.value } };
}

type TeamHealthReviewDateField =
  | "taskOpenDate"
  | "taskDueDate"
  | "assessmentOpenDate"
  | "assessmentDueDate"
  | "feedbackOpenDate"
  | "feedbackDueDate";

const teamHealthReviewDateFields: TeamHealthReviewDateField[] = [
  "taskOpenDate",
  "taskDueDate",
  "assessmentOpenDate",
  "assessmentDueDate",
  "feedbackOpenDate",
  "feedbackDueDate",
];

export function parseProjectTeamRequestAndUserBody(
  req: AuthRequest,
): ParseResult<{ projectId: number; teamId: number; requestId: number; userId: number }> {
  const projectId = parseProjectIdParam(req.params.projectId);
  const teamId = parseTeamIdParam(req.params.teamId);
  const requestId = parsePositiveInt(req.params.requestId, "requestId");
  const raw = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const userId = parsePositiveInt(raw.userId, "userId");
  if (!projectId.ok || !teamId.ok || !requestId.ok || !userId.ok) {
    return { ok: false, error: "Invalid user ID, project ID, team ID, or request ID" };
  }
  return {
    ok: true,
    value: {
      projectId: projectId.value,
      teamId: teamId.value,
      requestId: requestId.value,
      userId: userId.value,
    },
  };
}

export function parseTeamHealthReviewBody(body: unknown): ParseResult<{ resolved: boolean; responseText?: string }> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const resolved = parseBoolean(raw.resolved, "resolved");
  if (!resolved.ok) {
    return { ok: false, error: "resolved must be a boolean" };
  }

  const responseText = parseOptionalTrimmedString(raw.responseText, "responseText");
  if (!responseText.ok) {
    return { ok: false, error: "responseText must be a string when provided" };
  }

  if (resolved.value && !responseText.value) {
    return { ok: false, error: "responseText is required when resolving a request" };
  }

  return {
    ok: true,
    value: {
      resolved: resolved.value,
      ...(responseText.value !== undefined ? { responseText: responseText.value } : {}),
    },
  };
}

export function parseTeamHealthResolveBody(
  body: unknown,
): ParseResult<{
  deadlineOverrides: Partial<Record<TeamHealthReviewDateField, Date | null>>;
  options: {
    inputMode?: "SHIFT_DAYS" | "SELECT_DATE";
    shiftDays?: Partial<Record<TeamHealthReviewDateField, number>>;
  };
}> {
  const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const deadlineOverrides: Partial<Record<TeamHealthReviewDateField, Date | null>> = {};

  for (const field of teamHealthReviewDateFields) {
    const parsed = parseOptionalIsoDate(raw[field], field);
    if (!parsed.ok) {
      return { ok: false, error: `${field} must be a valid ISO date string` };
    }
    if (parsed.value !== undefined) {
      deadlineOverrides[field] = parsed.value;
    }
  }

  const inputMode = raw.deadlineInputMode === undefined
    ? { ok: true as const, value: undefined }
    : parseEnum(raw.deadlineInputMode, "deadlineInputMode", ["SHIFT_DAYS", "SELECT_DATE"] as const);
  if (!inputMode.ok) {
    return { ok: false, error: "deadlineInputMode must be SHIFT_DAYS or SELECT_DATE when provided" };
  }

  let shiftDays: Partial<Record<TeamHealthReviewDateField, number>> | undefined;
  if (raw.shiftDays !== undefined) {
    if (!raw.shiftDays || typeof raw.shiftDays !== "object" || Array.isArray(raw.shiftDays)) {
      return { ok: false, error: "shiftDays must be an object when provided" };
    }
    shiftDays = {};
    const candidate = raw.shiftDays as Record<string, unknown>;
    for (const field of teamHealthReviewDateFields) {
      if (candidate[field] === undefined) continue;
      const parsedShift = parsePositiveInt(candidate[field], `${field} shift`);
      if (!parsedShift.ok && candidate[field] !== 0) {
        return { ok: false, error: `${field} shift must be a whole number of 0 or greater` };
      }
      if (candidate[field] === 0) {
        shiftDays[field] = 0;
        continue;
      }
      if (typeof candidate[field] !== "number" || !Number.isInteger(candidate[field]) || candidate[field] < 0) {
        return { ok: false, error: `${field} shift must be a whole number of 0 or greater` };
      }
      shiftDays[field] = candidate[field] as number;
    }
  }

  return {
    ok: true,
    value: {
      deadlineOverrides,
      options: {
        ...(inputMode.value !== undefined ? { inputMode: inputMode.value } : {}),
        ...(shiftDays !== undefined ? { shiftDays } : {}),
      },
    },
  };
}
