import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  getModuleJoinCodeHandler,
  joinModuleHandler,
  rotateModuleJoinCodeHandler,
} from "./controller.js";
import { moduleJoinAttemptRateLimit } from "./rateLimit.js";

const router = Router();

router.post("/join", requireAuth, moduleJoinAttemptRateLimit, joinModuleHandler);
router.get("/modules/:moduleId/code", requireAuth, getModuleJoinCodeHandler);
router.post("/modules/:moduleId/code/rotate", requireAuth, rotateModuleJoinCodeHandler);

export default router;
