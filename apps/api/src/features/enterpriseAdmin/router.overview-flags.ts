import type { Router } from "express";
import { listFeatureFlags, getOverview, isEnterpriseAdminRole, updateFeatureFlag } from "./service.js";
import { parseFeatureFlagUpdateBody } from "./router.parsers.js";
import { ensureEnterpriseAdmin, resolveEnterpriseContext, sendServiceError } from "./router.helpers.js";
import type { EnterpriseRequest } from "./types.js";

export function registerOverviewAndFeatureFlagRoutes(router: Router) {
  router.get("/overview", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    if (!ensureEnterpriseAdmin(enterpriseUser, res)) return;
    return res.json(await getOverview(enterpriseUser));
  });

  router.get("/feature-flags", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const result = await listFeatureFlags(enterpriseUser);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result.value);
  });

  router.patch("/feature-flags/:key", async (req, res) => {
    const enterpriseUser = resolveEnterpriseContext(req as EnterpriseRequest, res);
    if (!enterpriseUser) return;
    const parsedBody = parseFeatureFlagUpdateBody(req.body);
    if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

    try {
      const result = await updateFeatureFlag(enterpriseUser, String(req.params.key), parsedBody.value.enabled);
      if (!result.ok) return sendServiceError(res, result);
      return res.json(result.value);
    } catch (error) {
      console.error("update feature flag error", error);
      return res.status(500).json({ error: "Could not update feature flag" });
    }
  });
}
