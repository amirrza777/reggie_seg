/* eslint-disable max-lines-per-function, max-statements, complexity, @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { resolveEnterpriseUser } from "./middleware.js";
import { registerOverviewAndFeatureFlagRoutes } from "./router.overview-flags.js";
import { registerModuleRoutes } from "./router.modules.js";
import { registerForumReportRoutes } from "./router.forum-reports.js";

const router = Router();

router.use(requireAuth);
router.use(resolveEnterpriseUser);

registerOverviewAndFeatureFlagRoutes(router);
registerModuleRoutes(router);
registerForumReportRoutes(router);

export default router;
