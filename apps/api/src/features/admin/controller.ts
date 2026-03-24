import type { Response } from "express";
import { parseAdminEnterpriseSearchFilters } from "./enterpriseSearch.js";
import { parseAdminUserSearchFilters } from "./userSearch.js";
import {
  parseAdminEnterpriseIdParam,
  parseAdminUserIdParam,
  parseCreateEnterpriseBody,
  parseUpdateUserBody,
  parseUpdateUserRoleBody,
} from "./controller.parsers.js";
import type { AdminRequest } from "./types.js";
import {
  createEnterprise,
  deleteEnterprise,
  getAuditLogs,
  getSummary,
  listEnterpriseUsers,
  listEnterprises,
  listUsers,
  searchEnterpriseUsers,
  searchEnterprises,
  searchUsers,
  updateEnterpriseUser,
  updateOwnEnterpriseUser,
  updateOwnEnterpriseUserRole,
} from "./service.js";

export async function getSummaryHandler(req: AdminRequest, res: Response) {
  return res.json(await getSummary(req.adminUser?.enterpriseId as string));
}

export async function listUsersHandler(req: AdminRequest, res: Response) {
  return res.json(await listUsers(req.adminUser?.enterpriseId as string));
}

export async function searchUsersHandler(req: AdminRequest, res: Response) {
  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchUsers(req.adminUser?.enterpriseId as string, parsedFilters.value));
}

export async function updateUserRoleHandler(req: AdminRequest, res: Response) {
  const id = parseAdminUserIdParam(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const role = parseUpdateUserRoleBody(req.body);
  if (!role.ok) return res.status(400).json({ error: role.error });
  const result = await updateOwnEnterpriseUserRole(req.adminUser?.enterpriseId as string, id.value, role.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function updateUserHandler(req: AdminRequest, res: Response) {
  const id = parseAdminUserIdParam(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const updates = parseUpdateUserBody(req.body);
  if (!updates.ok) return res.status(400).json({ error: updates.error });
  const result = await updateOwnEnterpriseUser(req.adminUser?.enterpriseId as string, id.value, updates.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function listEnterprisesHandler(_req: AdminRequest, res: Response) {
  return res.json(await listEnterprises());
}

export async function searchEnterprisesHandler(req: AdminRequest, res: Response) {
  const parsedFilters = parseAdminEnterpriseSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchEnterprises(parsedFilters.value));
}

export async function createEnterpriseHandler(req: AdminRequest, res: Response) {
  try {
    const parsedBody = parseCreateEnterpriseBody(req.body);
    if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });
    const result = await createEnterprise(parsedBody.value);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.value);
  } catch (err) {
    console.error("create enterprise error", err);
    return res.status(500).json({ error: "Could not create enterprise" });
  }
}

export async function listEnterpriseUsersHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  const result = await listEnterpriseUsers(enterpriseId.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function searchEnterpriseUsersHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  const result = await searchEnterpriseUsers(enterpriseId.value, parsedFilters.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function updateEnterpriseUserHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  const id = parseAdminUserIdParam(req.params.id);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  if (!id.ok) return res.status(400).json({ error: id.error });
  const updates = parseUpdateUserBody(req.body);
  if (!updates.ok) return res.status(400).json({ error: updates.error });
  const result = await updateEnterpriseUser(enterpriseId.value, id.value, updates.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function deleteEnterpriseHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  const result = await deleteEnterprise(enterpriseId.value, req.adminUser?.enterpriseId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function listAuditLogsHandler(req: AdminRequest, res: Response) {
  const enterpriseId = req.adminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });
  const parsedFrom = req.query.from ? new Date(String(req.query.from)) : undefined;
  const parsedTo = req.query.to ? new Date(String(req.query.to)) : undefined;
  const from = parsedFrom && !isNaN(parsedFrom.getTime()) ? parsedFrom : undefined;
  const to = parsedTo && !isNaN(parsedTo.getTime()) ? parsedTo : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  return res.json(
    await getAuditLogs(enterpriseId, {
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(limit !== undefined ? { limit } : {}),
    })
  );
}
