import { Router } from "express";
import {
  getAllModulesSummaryHandler,
  getModuleDetailsHandler,
  getTeamDetailsHandler,
  getStudentDetailsHandler,
  upsertTeamMarkingHandler,
  upsertStudentMarkingHandler,
} from "./controller.js";

const router = Router();

router.get("/modules", getAllModulesSummaryHandler);
router.get("/module/:moduleId", getModuleDetailsHandler);
router.get("/module/:moduleId/team/:teamId", getTeamDetailsHandler);
router.get("/module/:moduleId/team/:teamId/student/:studentId", getStudentDetailsHandler);
router.put("/module/:moduleId/team/:teamId/marking", upsertTeamMarkingHandler);
router.put("/module/:moduleId/team/:teamId/student/:studentId/marking", upsertStudentMarkingHandler);

export default router;