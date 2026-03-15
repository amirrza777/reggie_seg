import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  listModulesHandler,
  listProjectsHandler,
  listTeamsHandler,
  archiveModuleHandler,
  unarchiveModuleHandler,
  archiveProjectHandler,
  unarchiveProjectHandler,
  archiveTeamHandler,
  unarchiveTeamHandler,
} from "./controller.js";

const router = Router();

router.get("/modules", requireAuth, listModulesHandler);
router.get("/projects", requireAuth, listProjectsHandler);
router.get("/teams", requireAuth, listTeamsHandler);

router.patch("/modules/:id/archive", requireAuth, archiveModuleHandler);
router.patch("/modules/:id/unarchive", requireAuth, unarchiveModuleHandler);
router.patch("/projects/:id/archive", requireAuth, archiveProjectHandler);
router.patch("/projects/:id/unarchive", requireAuth, unarchiveProjectHandler);
router.patch("/teams/:id/archive", requireAuth, archiveTeamHandler);
router.patch("/teams/:id/unarchive", requireAuth, unarchiveTeamHandler);

export default router;
