import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { resolveEnterpriseUser } from "./middleware.js";
import {
  createModule,
  deleteModule,
  ensureCreatorLeader,
  getModuleAccess,
  getModuleAccessSelection,
  getModuleStudents,
  getOverview,
  listAssignableUsers,
  listModules,
  parseAccessUserSearchFilters,
  parseModulePayload,
  parseModuleSearchFilters,
  parsePositiveInt,
  parsePositiveIntArray,
  searchAssignableUsers,
  searchModules,
  updateModule,
  updateModuleStudents,
  isEnterpriseAdminRole,
} from "./service.js";
import type { EnterpriseRequest } from "./types.js";

const router = Router();

router.use(requireAuth);
router.use(resolveEnterpriseUser);

router.get("/overview", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  return res.json(await getOverview(enterpriseUser));
});

router.get("/modules", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  return res.json(await listModules(enterpriseUser));
});

router.get("/modules/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseModuleSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchModules(enterpriseUser, parsedFilters.value));
});

router.get("/modules/access-users", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  return res.json(await listAssignableUsers(enterpriseUser));
});

router.get("/modules/access-users/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseAccessUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchAssignableUsers(enterpriseUser, parsedFilters.value));
});

router.post("/modules", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });

  const leaderIds = ensureCreatorLeader(payload.value.leaderIds, enterpriseUser);
  if (leaderIds.length === 0) {
    return res.status(400).json({ error: "At least one module leader is required" });
  }
  const result = await createModule(enterpriseUser, { ...payload.value, leaderIds });
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.status(201).json(result.value);
});

router.get("/modules/:moduleId/access", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleAccess(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/modules/:moduleId/access-selection", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleAccessSelection(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.put("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });
  const result = await updateModule(enterpriseUser, moduleId, payload.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.delete("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await deleteModule(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/modules/:moduleId/students", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleStudents(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.put("/modules/:moduleId/students", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const parsedStudentIds = parsePositiveIntArray(req.body?.studentIds, "studentIds");
  if (!parsedStudentIds.ok) return res.status(400).json({ error: parsedStudentIds.error });
  const result = await updateModuleStudents(enterpriseUser, moduleId, parsedStudentIds.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

export default router;
