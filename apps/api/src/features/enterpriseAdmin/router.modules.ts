import type { Router } from "express";
import { setSensitiveNoStore } from "../../shared/httpCache.js";
import { parseMeetingSettingsBody } from "./router.parsers.js";
import {
  createModule,
  deleteModule,
  getModuleAccess,
  getModuleAccessSelection,
  getModuleJoinCode,
  getModuleMeetingSettings,
  getModuleStudents,
  isEnterpriseAdminRole,
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
  updateModuleMeetingSettings,
  updateModuleStudents,
} from "./service.js";
import { resolveEnterpriseContext, sendServiceError } from "./router.helpers.js";
import type { EnterpriseRequest } from "./types.js";

export function registerModuleRoutes(router: Router) {
  router.get("/modules", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    return res.json(await listModules(enterpriseUser));
  });

  router.get("/modules/search", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const parsedFilters = parseModuleSearchFilters(req.query);
    if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
    return res.json(await searchModules(enterpriseUser, parsedFilters.value));
  });

  router.get("/modules/access-users", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    return res.json(await listAssignableUsers(enterpriseUser));
  });

  router.get("/modules/access-users/search", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const parsedFilters = parseAccessUserSearchFilters(req.query);
    if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
    return res.json(await searchAssignableUsers(enterpriseUser, parsedFilters.value));
  });

  router.post("/modules", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!isEnterpriseAdminRole(enterpriseUser.role)) {
      return res.status(403).json({ error: "Only enterprise admins can create modules" });
    }
    const payload = parseModulePayload(req.body);
    if (!payload.ok) return res.status(400).json({ error: payload.error });
    if (payload.value.leaderIds.length === 0) {
      return res.status(400).json({ error: "At least one module leader is required" });
    }
    const result = await createModule(enterpriseUser, payload.value);
    if (!result.ok) return sendServiceError(res, result);
    setSensitiveNoStore(res);
    return res.status(201).json(result.value);
  });

  router.get("/modules/:moduleId/access", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await getModuleAccess(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.get("/modules/:moduleId/access-selection", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await getModuleAccessSelection(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.get("/modules/:moduleId/join-code", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await getModuleJoinCode(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    setSensitiveNoStore(res);
    return res.json(result.value);
  });

  router.put("/modules/:moduleId", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const payload = parseModulePayload(req.body);
    if (!payload.ok) return res.status(400).json({ error: payload.error });
    const result = await updateModule(enterpriseUser, moduleId, payload.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.delete("/modules/:moduleId", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await deleteModule(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.get("/modules/:moduleId/students", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await getModuleStudents(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.put("/modules/:moduleId/students", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const parsedStudentIds = parsePositiveIntArray(req.body?.studentIds, "studentIds");
    if (!parsedStudentIds.ok) return res.status(400).json({ error: parsedStudentIds.error });
    const result = await updateModuleStudents(enterpriseUser, moduleId, parsedStudentIds.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.get("/modules/:moduleId/meeting-settings", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const result = await getModuleMeetingSettings(enterpriseUser, moduleId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.put("/modules/:moduleId/meeting-settings", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const moduleId = parsePositiveInt(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module id" });
    const parsedBody = parseMeetingSettingsBody(req.body);
    if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
    const result = await updateModuleMeetingSettings(enterpriseUser, moduleId, parsedBody.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });
}
