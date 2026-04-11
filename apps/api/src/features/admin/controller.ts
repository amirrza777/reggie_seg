import type { Response } from "express";
import { subscribeToAuditStream, unsubscribeFromAuditStream } from "../audit/sse.js";
import { parseAdminEnterpriseSearchFilters } from "./enterpriseSearch.js";
import { parseAdminUserSearchFilters } from "./userSearch.js";
import {
  parseAdminEnterpriseIdParam,
  parseAdminUserIdParam,
  parseAuditLogsQuery,
  parseCreateEnterpriseBody,
  parseInviteEnterpriseAdminBody,
  parseUpdateUserBody,
  parseUpdateUserRoleBody,
} from "./controller.parsers.js";
import type { AdminRequest } from "./types.js";
import {
  createEnterprise,
  deleteEnterprise,
  getAuditLogs,
  getSummary,
  inviteEnterpriseAdmin,
  inviteGlobalAdmin,
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

async function processEnterpriseAdminInvite(
  req: AdminRequest,
  res: Response,
  enterpriseId: string,
  failureLabel: string,
) {
  const parsedBody = parseInviteEnterpriseAdminBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await inviteEnterpriseAdmin(
      { enterpriseId, email: parsedBody.value.email },
      req.adminUser?.id,
    );
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.value);
  } catch (err) {
    console.error(`${failureLabel} error`, err);
    return res.status(500).json({ error: "Could not send enterprise admin invite" });
  }
}

export async function getSummaryHandler(req: AdminRequest, res: Response) {
  return res.json(await getSummary(req.adminUser?.enterpriseId as string));
}

export async function listUsersHandler(req: AdminRequest, res: Response) {
  return res.json(await listUsers(req.adminUser));
}

export async function searchUsersHandler(req: AdminRequest, res: Response) {
  const parsedFilters = parseAdminUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchUsers(parsedFilters.value, req.adminUser));
}

export async function updateUserRoleHandler(req: AdminRequest, res: Response) {
  const id = parseAdminUserIdParam(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const role = parseUpdateUserRoleBody(req.body);
  if (!role.ok) return res.status(400).json({ error: role.error });
  const result = await updateOwnEnterpriseUserRole(id.value, role.value, req.adminUser);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function updateUserHandler(req: AdminRequest, res: Response) {
  const id = parseAdminUserIdParam(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });
  const updates = parseUpdateUserBody(req.body);
  if (!updates.ok) return res.status(400).json({ error: updates.error });
  const result = await updateOwnEnterpriseUser(id.value, updates.value, req.adminUser);
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
    const result = await createEnterprise(parsedBody.value, req.adminUser?.id);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.value);
  } catch (err) {
    console.error("create enterprise error", err);
    return res.status(500).json({ error: "Could not create enterprise" });
  }
}

export async function inviteEnterpriseAdminHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  return processEnterpriseAdminInvite(req, res, enterpriseId.value, "invite enterprise admin");
}

export async function inviteCurrentEnterpriseAdminHandler(req: AdminRequest, res: Response) {
  const enterpriseId = req.adminUser?.enterpriseId;
  if (!enterpriseId) {
    return res.status(400).json({ error: "Enterprise context is required" });
  }
  return processEnterpriseAdminInvite(req, res, enterpriseId, "invite current enterprise admin");
}

export async function inviteGlobalAdminHandler(req: AdminRequest, res: Response) {
  const parsedBody = parseInviteEnterpriseAdminBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const result = await inviteGlobalAdmin(
      { email: parsedBody.value.email },
      req.adminUser,
    );
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result.value);
  } catch (err) {
    console.error("invite global admin error", err);
    return res.status(500).json({ error: "Could not send global admin invite" });
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
  const result = await updateEnterpriseUser(enterpriseId.value, id.value, updates.value, req.adminUser?.id);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function deleteEnterpriseHandler(req: AdminRequest, res: Response) {
  const enterpriseId = parseAdminEnterpriseIdParam(req.params.enterpriseId);
  if (!enterpriseId.ok) return res.status(400).json({ error: enterpriseId.error });
  const result = await deleteEnterprise(enterpriseId.value, req.adminUser?.enterpriseId, req.adminUser?.id);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
}

export async function listAuditLogsHandler(req: AdminRequest, res: Response) {
  const enterpriseId = req.adminUser?.enterpriseId;
  if (!enterpriseId) return res.status(500).json({ error: "Enterprise not resolved" });
  const parsedQuery = parseAuditLogsQuery(req.query);
  if (!parsedQuery.ok) return res.status(400).json({ error: parsedQuery.error });
  return res.json(await getAuditLogs(enterpriseId, parsedQuery.value));
}

export function auditLogsStreamHandler(req: AdminRequest, res: Response) {
  const enterpriseId = req.adminUser?.enterpriseId;
  if (!enterpriseId) {
    res.status(500).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30_000);

  subscribeToAuditStream(enterpriseId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribeFromAuditStream(enterpriseId, res);
  });
}
