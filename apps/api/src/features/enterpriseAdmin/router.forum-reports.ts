import type { Router } from "express";
import { parsePositiveInt } from "./service.js";
import { ensureEnterpriseAdmin, resolveEnterpriseContext, sendServiceError } from "./router.helpers.js";
import {
  dismissForumReportForEnterprise,
  getForumReportConversationForEnterprise,
  listForumReportsForEnterprise,
  removeForumReportForEnterprise,
} from "./forum-reports.service.js";
import type { EnterpriseRequest } from "./types.js";

export function registerForumReportRoutes(router: Router) {
  router.get("/forum-reports", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!ensureEnterpriseAdmin(enterpriseUser, res)) return;
    return res.json(await listForumReportsForEnterprise(enterpriseUser));
  });

  router.get("/forum-reports/:id/conversation", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!ensureEnterpriseAdmin(enterpriseUser, res)) return;
    const reportId = parsePositiveInt(req.params.id);
    if (!reportId) return res.status(400).json({ error: "Invalid report id" });
    const result = await getForumReportConversationForEnterprise(enterpriseUser, reportId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.delete("/forum-reports/:id", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!ensureEnterpriseAdmin(enterpriseUser, res)) return;
    const reportId = parsePositiveInt(req.params.id);
    if (!reportId) return res.status(400).json({ error: "Invalid report id" });
    const result = await dismissForumReportForEnterprise(enterpriseUser, reportId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.delete("/forum-reports/:id/remove", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!ensureEnterpriseAdmin(enterpriseUser, res)) return;
    const reportId = parsePositiveInt(req.params.id);
    if (!reportId) return res.status(400).json({ error: "Invalid report id" });
    const result = await removeForumReportForEnterprise(enterpriseUser, reportId);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });
}
