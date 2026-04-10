import type { Response } from "express";
import type { CustomAllocationValidationCode } from "../customAllocator/customAllocation.validation.js";

export function respondCustomAllocationValidationError(
  res: Response,
  code: CustomAllocationValidationCode,
) {
  if (code === "INVALID_PROJECT_ID") {
    return res.status(400).json({ error: "Invalid project ID" });
  }
  if (code === "INVALID_TEMPLATE_ID") {
    return res.status(400).json({ error: "questionnaireTemplateId must be a positive integer" });
  }
  if (code === "INVALID_TEAM_COUNT") {
    return res.status(400).json({ error: "teamCount must be a positive integer" });
  }
  if (code === "INVALID_MIN_TEAM_SIZE") {
    return res.status(400).json({ error: "minTeamSize must be a positive integer when provided" });
  }
  if (code === "INVALID_MAX_TEAM_SIZE") {
    return res.status(400).json({ error: "maxTeamSize must be a positive integer when provided" });
  }
  if (code === "INVALID_TEAM_SIZE_RANGE") {
    return res.status(400).json({ error: "minTeamSize cannot be greater than maxTeamSize" });
  }
  if (code === "INVALID_NON_RESPONDENT_STRATEGY") {
    return res.status(400).json({
      error: "nonRespondentStrategy must be either 'distribute_randomly' or 'exclude'",
    });
  }
  if (code === "INVALID_CRITERIA") {
    return res.status(400).json({
      error: "Each criterion must include a valid questionId, strategy, and weight between 1 and 5",
    });
  }
  if (code === "INVALID_PREVIEW_ID") {
    return res.status(400).json({ error: "previewId is required" });
  }
  return res.status(400).json({ error: "teamNames must be an array of strings when provided" });
}

export function parseOptionalPositiveInteger(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return "invalid";
  }
  return parsed;
}

export function parseManualAllocationSearchQuery(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return "invalid";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 120) {
    return "invalid";
  }
  return trimmed;
}

export function formatCustomAllocationStaleStudentNames(staleStudents: unknown): string | null {
  if (!Array.isArray(staleStudents) || staleStudents.length === 0) {
    return null;
  }

  const names = staleStudents
    .map((student) => {
      if (!student || typeof student !== "object") {
        return "";
      }
      const row = student as Record<string, unknown>;
      const firstName = typeof row.firstName === "string" ? row.firstName.trim() : "";
      const lastName = typeof row.lastName === "string" ? row.lastName.trim() : "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName.length > 0) {
        return fullName;
      }
      if (typeof row.email === "string" && row.email.trim().length > 0) {
        return row.email.trim();
      }
      return "";
    })
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    return null;
  }

  const visibleNames = names.slice(0, 5);
  const remainderCount = names.length - visibleNames.length;
  const suffix = remainderCount > 0 ? ` (+${remainderCount} more)` : "";
  return `${visibleNames.join(", ")}${suffix}`;
}