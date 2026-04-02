import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { rateLimit } from "../../shared/rateLimit.js";
import {
  getModuleJoinCodeHandler,
  joinModuleHandler,
  rotateModuleJoinCodeHandler,
} from "./controller.js";

const router = Router();
const joinRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  prefix: "module-join:join",
});

router.post("/join", requireAuth, joinRateLimit, joinModuleHandler);
router.get("/modules/:moduleId/code", requireAuth, getModuleJoinCodeHandler);
router.post("/modules/:moduleId/code/rotate", requireAuth, rotateModuleJoinCodeHandler);

export default router;
