import type { Response } from "express";
import { parseAdminEnterpriseSearchFilters } from "./enterpriseSearch.js";
import { parseAdminUserSearchFilters } from "./userSearch.js";
import type { AdminRequest } from "./types.js";
import {
  createEnterprise,
  deleteEnterprise,
  getAuditLogs,
  getSummary,
  isRole,
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

function parsePositiveInt(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function readParamString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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
  const id = parsePositiveInt(readParamString(req.params.id));
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  const role = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : "";
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });
  const result = await updateOwnEnterpriseUserRole(req.adminUser?.enterpriseId as string, id, role);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function updateUserHandler(req: AdminRequest, res: Response) {
  const id = parsePositiveInt(readParamString(req.params.id));
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  const nextRole = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : undefined;
  type RoleUpdate = NonNullable<Parameters<typeof updateOwnEnterpriseUser>[2]["role"]>;
  const updates: { active?: boolean; role?: RoleUpdate } = {};
  if (typeof req.body?.active === "boolean") {
    updates.active = req.body.active;
  }
  if (nextRole && isRole(nextRole)) {
    updates.role = nextRole;
  }
  const result = await updateOwnEnterpriseUser(req.adminUser?.enterpriseId as string, id, updates);
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
    const result = await createEnterprise({
      name: typeof req.body?.name === "string" ? req.body.name : "",
      code: typeof req.body?.code === "string" ? req.body.code : null,
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.value);
  } catch (err) {
    console.error("create enterprise error", err);
    return res.status(500).json({ error: "Could not create enterprise" });
  }
}

export async function listEnterpriseUsersHandler(req: AdminRequest, res: Response) {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });
  const result = await listEnterpriseUsers(enterpriseId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function searchEnterpriseUsersHandler(req: AdminRequest, res: Response) {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });
  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  const result = await searchEnterpriseUsers(enterpriseId, parsedFilters.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function updateEnterpriseUserHandler(req: AdminRequest, res: Response) {
  const enterpriseId = String(req.params.enterpriseId || "");
  const id = parsePositiveInt(readParamString(req.params.id));
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });
  if (!id) return res.status(400).json({ error: "Invalid user id" });
  const nextRole = typeof req.body?.role === "string" ? req.body.role.toUpperCase() : undefined;
  type RoleUpdate = NonNullable<Parameters<typeof updateEnterpriseUser>[2]["role"]>;
  const updates: { active?: boolean; role?: RoleUpdate } = {};
  if (typeof req.body?.active === "boolean") {
    updates.active = req.body.active;
  }
  if (nextRole && isRole(nextRole)) {
    updates.role = nextRole;
  }
  const result = await updateEnterpriseUser(enterpriseId, id, updates);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function deleteEnterpriseHandler(req: AdminRequest, res: Response) {
  const enterpriseId = String(req.params.enterpriseId || "");
  if (!enterpriseId) return res.status(400).json({ error: "Enterprise id is required" });
  const result = await deleteEnterprise(enterpriseId, req.adminUser?.enterpriseId);
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
