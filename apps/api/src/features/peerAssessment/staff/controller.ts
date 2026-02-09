import type { Request, Response } from "express";
import {
  getProgressForModulesILead,
  getProgressForTeam,
  getModuleDetailsIfLead,
  getTeamDetailsIfLead,
  getStudentDetailsIfLead,
} from "./service.js";

const NOT_MODULE_LEAD = "You are not a module lead for this module.";

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

/**
 * Single handler: modules > module > team > student.
 */
async function handleStaffScope<T>(
  req: Request,
  res: Response,
  parsers: ParseFn[],
  fetch: (...ids: number[]) => Promise<T | null>,
  options: { requireLead: boolean; errorContext: string }
): Promise<void> {
  const ids: number[] = [];
  for (const parse of parsers) {
    const id = parse(req, res);
    if (id == null) return;
    ids.push(id);
  }
  try {
    const result = await fetch(...ids);
    if (options.requireLead && result == null) {
      res.status(403).json({ error: NOT_MODULE_LEAD });
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
    requireLead: true,
    errorContext: "Error fetching module details",
  });

export const getTeamDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam],
    getTeamDetailsIfLead,
    { requireLead: true, errorContext: "Error fetching team details" }
  );

export const getStudentDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam, parseStudentIdParam],
    getStudentDetailsIfLead,
    { requireLead: true, errorContext: "Error fetching student details" }
  );

export const getAllModulesSummaryHandler = (req: Request, res: Response) =>
  handleStaffScope(req, res, [parseStaffId], getProgressForModulesILead, {
    requireLead: false,
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
