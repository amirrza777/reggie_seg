import type { Request, Response } from "express";
import {
  getProgressForModulesILead,
  getProgressForTeam,
  getModuleDetailsIfLead,
  getTeamDetailsIfLead,
  getStudentDetailsIfLead,
  saveTeamMarkingIfLead,
  saveStudentMarkingIfLead,
} from "./service.js";

const STAFF_SCOPE_NOT_FOUND = "Requested module data was not found.";

type ParseFn = (req: Request, res: Response) => number | null;

function parseStaffId(req: Request, res: Response): number | null {
  const staffId = parseInt(req.query.staffId as string);
  if (!req.query.staffId || Number.isNaN(staffId)) {
    res.status(400).json({ error: "staffId is required" });
    return null;
  }
  return staffId;
}

function parseModuleIdParam(req: Request, res: Response): number | null {
  const moduleId = parseInt(req.params.moduleId as string);
  if (Number.isNaN(moduleId) || req.params.moduleId == null) {
    res.status(400).json({ error: "Valid module ID is required" });
    return null;
  }
  return moduleId;
}

function parseTeamIdParam(req: Request, res: Response): number | null {
  const teamId = parseInt(req.params.teamId as string);
  if (Number.isNaN(teamId) || req.params.teamId == null) {
    res.status(400).json({ error: "Valid team ID is required" });
    return null;
  }
  return teamId;
}

function parseStudentIdParam(req: Request, res: Response): number | null {
  const studentId = parseInt(req.params.studentId as string);
  if (Number.isNaN(studentId) || req.params.studentId == null) {
    res.status(400).json({ error: "Valid student ID is required" });
    return null;
  }
  return studentId;
}

function parseMarkingBody(
  req: Request,
  res: Response
): { mark: number | null; formativeFeedback: string | null } | null {
  const rawMark = req.body?.mark;
  const rawFeedback = req.body?.formativeFeedback;

  let mark: number | null = null;
  if (rawMark !== undefined && rawMark !== null && rawMark !== "") {
    if (typeof rawMark !== "number" || Number.isNaN(rawMark)) {
      res.status(400).json({ error: "mark must be a number between 0 and 100." });
      return null;
    }
    if (rawMark < 0 || rawMark > 100) {
      res.status(400).json({ error: "mark must be between 0 and 100." });
      return null;
    }
    mark = Math.round(rawMark * 100) / 100;
  }

  let formativeFeedback: string | null = null;
  if (rawFeedback !== undefined && rawFeedback !== null) {
    if (typeof rawFeedback !== "string") {
      res.status(400).json({ error: "formativeFeedback must be a string." });
      return null;
    }
    const trimmed = rawFeedback.trim();
    formativeFeedback = trimmed.length > 0 ? trimmed : null;
  }

  return { mark, formativeFeedback };
}

/**
 * Single handler: modules > module > team > student.
 */
async function handleStaffScope<T>(
  req: Request,
  res: Response,
  parsers: ParseFn[],
  fetch: (...ids: number[]) => Promise<T | null>,
  options: { requireResult: boolean; errorContext: string; notFoundStatus?: number }
): Promise<void> {
  const ids: number[] = [];
  for (const parse of parsers) {
    const id = parse(req, res);
    if (id == null) return;
    ids.push(id);
  }
  try {
    const result = await fetch(...ids);
    if (options.requireResult && result == null) {
      res.status(options.notFoundStatus ?? 404).json({ error: STAFF_SCOPE_NOT_FOUND });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error(options.errorContext, error);
    res.status(500).json({ error: options.errorContext });
  }
}

export const getModuleDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(req, res, [parseStaffId, parseModuleIdParam], getModuleDetailsIfLead, {
    requireResult: true,
    errorContext: "Error fetching module details",
  });

export const getTeamDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam],
    getTeamDetailsIfLead,
    { requireResult: true, errorContext: "Error fetching team details" }
  );

export const getStudentDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam, parseStudentIdParam],
    getStudentDetailsIfLead,
    { requireResult: true, errorContext: "Error fetching student details" }
  );

export const getAllModulesSummaryHandler = (req: Request, res: Response) =>
  handleStaffScope(req, res, [parseStaffId], getProgressForModulesILead, {
    requireResult: false,
    errorContext: "Error fetching staff modules",
  });

export async function getModuleTeamsSummaryHandler(req: Request, res: Response) {
  const moduleId = parseInt(req.query.moduleId as string, 10);
  if (!req.query.moduleId || Number.isNaN(moduleId)) {
    return res.status(400).json({ error: "moduleId is required" });
  }
  try {
    const teams = await getProgressForTeam(moduleId);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching module teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
}

export async function upsertTeamMarkingHandler(req: Request, res: Response) {
  const staffId = parseStaffId(req, res);
  const moduleId = parseModuleIdParam(req, res);
  const teamId = parseTeamIdParam(req, res);
  const marking = parseMarkingBody(req, res);
  if (staffId == null || moduleId == null || teamId == null || marking == null) return;

  try {
    const result = await saveTeamMarkingIfLead(staffId, moduleId, teamId, marking);
    if (!result) {
      res.status(404).json({ error: STAFF_SCOPE_NOT_FOUND });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error("Error saving team marking", error);
    res.status(500).json({ error: "Error saving team marking" });
  }
}

export async function upsertStudentMarkingHandler(req: Request, res: Response) {
  const staffId = parseStaffId(req, res);
  const moduleId = parseModuleIdParam(req, res);
  const teamId = parseTeamIdParam(req, res);
  const studentId = parseStudentIdParam(req, res);
  const marking = parseMarkingBody(req, res);
  if (staffId == null || moduleId == null || teamId == null || studentId == null || marking == null) return;

  try {
    const result = await saveStudentMarkingIfLead(staffId, moduleId, teamId, studentId, marking);
    if (!result) {
      res.status(404).json({ error: STAFF_SCOPE_NOT_FOUND });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error("Error saving student marking", error);
    res.status(500).json({ error: "Error saving student marking" });
  }
}