/* eslint-disable max-lines-per-function, max-statements, complexity, @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { resolveEnterpriseUser } from "./middleware.js";
import { registerOverviewAndFeatureFlagRoutes } from "./router/router.overview-flags.js";
import { registerModuleRoutes } from "./router/router.modules.js";
import { registerForumReportRoutes } from "./router/router.forum-reports.js";
import { registerUserManagementRoutes } from "./router-user-management/router.user-management.js";

const router = Router();

router.use(requireAuth);
router.use(resolveEnterpriseUser);

registerOverviewAndFeatureFlagRoutes(router);
registerUserManagementRoutes(router);
registerModuleRoutes(router);
registerForumReportRoutes(router);

export default router;
