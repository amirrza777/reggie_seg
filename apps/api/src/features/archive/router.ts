import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  listModulesHandler,
  listProjectsHandler,
  archiveModuleHandler,
  unarchiveModuleHandler,
  archiveProjectHandler,
  unarchiveProjectHandler,
} from "./controller.js";

const router = Router();

router.get("/modules", requireAuth, listModulesHandler);
router.get("/projects", requireAuth, listProjectsHandler);

router.patch("/modules/:id/archive", requireAuth, archiveModuleHandler);
router.patch("/modules/:id/unarchive", requireAuth, unarchiveModuleHandler);
router.patch("/projects/:id/archive", requireAuth, archiveProjectHandler);
router.patch("/projects/:id/unarchive", requireAuth, unarchiveProjectHandler);

export default router;
