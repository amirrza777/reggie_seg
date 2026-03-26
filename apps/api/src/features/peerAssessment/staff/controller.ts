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
import {
  parseMarkingBody as parseMarkingBodyParser,
  parseModuleIdParam as parseModuleIdParamParser,
  parseModuleIdQuery,
  parseStaffIdQuery,
  parseStudentIdParam as parseStudentIdParamParser,
  parseTeamIdParam as parseTeamIdParamParser,
} from "./controller.parsers.js";

const STAFF_SCOPE_NOT_FOUND = "Requested module data was not found.";

type ParseFn = (req: Request, res: Response) => number | null;

function parseStaffId(req: Request, res: Response): number | null {
  const parsed = parseStaffIdQuery(req.query.staffId);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
}

function parseModuleIdParam(req: Request, res: Response): number | null {
  const parsed = parseModuleIdParamParser(req.params.moduleId);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
}

function parseTeamIdParam(req: Request, res: Response): number | null {
  const parsed = parseTeamIdParamParser(req.params.teamId);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
}

function parseStudentIdParam(req: Request, res: Response): number | null {
  const parsed = parseStudentIdParamParser(req.params.studentId);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
}

function parseMarkingBody(
  req: Request,
  res: Response
): { mark: number | null; formativeFeedback: string | null } | null {
  const parsed = parseMarkingBodyParser(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  return parsed.value;
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

/** Handles requests for get module details. */
export const getModuleDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(req, res, [parseStaffId, parseModuleIdParam], getModuleDetailsIfLead, {
    requireResult: true,
    errorContext: "Error fetching module details",
    notFoundStatus: 403,
  });

/** Handles requests for get team details. */
export const getTeamDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam],
    getTeamDetailsIfLead,
    { requireResult: true, errorContext: "Error fetching team details" }
  );

/** Handles requests for get student details. */
export const getStudentDetailsHandler = (req: Request, res: Response) =>
  handleStaffScope(
    req,
    res,
    [parseStaffId, parseModuleIdParam, parseTeamIdParam, parseStudentIdParam],
    getStudentDetailsIfLead,
    { requireResult: true, errorContext: "Error fetching student details" }
  );

/** Handles requests for get all modules summary. */
export const getAllModulesSummaryHandler = (req: Request, res: Response) =>
  handleStaffScope(req, res, [parseStaffId], getProgressForModulesILead, {
    requireResult: false,
    errorContext: "Error fetching staff modules",
  });

/** Handles requests for get module teams summary. */
export async function getModuleTeamsSummaryHandler(req: Request, res: Response) {
  const moduleId = parseModuleIdQuery(req.query.moduleId);
  if (!moduleId.ok) return res.status(400).json({ error: moduleId.error });
  try {
    const teams = await getProgressForTeam(moduleId.value);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching module teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
}

/** Handles requests for upsert team marking. */
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

/** Handles requests for upsert student marking. */
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
