import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { dismissFlagHandler } from "./controller.js";

const router = Router();

router.patch("/:teamId/dismiss-flag", requireAuth, dismissFlagHandler);

export default router;
