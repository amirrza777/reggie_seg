import { Router } from "express";
import {
  getAllModulesSummaryHandler,
  getModuleDetailsHandler,
  getTeamDetailsHandler,
  getStudentDetailsHandler,
} from "./controller.js";

const router = Router();

router.get("/modules", getAllModulesSummaryHandler);
router.get("/module/:moduleId", getModuleDetailsHandler);
router.get("/module/:moduleId/team/:teamId", getTeamDetailsHandler);
router.get("/module/:moduleId/team/:teamId/student/:studentId", getStudentDetailsHandler);

export default router;