import type { Router } from "express";
import {
  createEnterpriseUser,
  parseEnterpriseUserSearchFilters,
  parsePositiveInt,
  removeEnterpriseUser,
  searchEnterpriseUsers,
  updateEnterpriseUser,
} from "../service.js";
import { parseEnterpriseUserCreateBody, parseEnterpriseUserUpdateBody } from "../router.parsers.js";
import { resolveEnterpriseContext, sendServiceError } from "../router.helpers.js";
import type { EnterpriseRequest } from "../types.js";

export function registerUserManagementRoutes(router: Router) {
  router.get("/users/search", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const parsedFilters = parseEnterpriseUserSearchFilters(req.query);
    if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
    const result = await searchEnterpriseUsers(enterpriseUser, parsedFilters.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.post("/users", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const parsedBody = parseEnterpriseUserCreateBody(req.body);
    if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
    const result = await createEnterpriseUser(enterpriseUser, parsedBody.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.status(201).json(result.value);
  });

  router.patch("/users/:id", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const userId = parsePositiveInt(req.params.id);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });
    const parsedBody = parseEnterpriseUserUpdateBody(req.body);
    if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
    const result = await updateEnterpriseUser(enterpriseUser, userId, parsedBody.value);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.delete("/users/:id", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const userId = parsePositiveInt(req.params.id);
    if (!userId) return res.status(400).json({ error: "Invalid user id" });
    const result = await removeEnterpriseUser(enterpriseUser, userId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });
}
