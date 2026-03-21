import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { listFeatureFlagsHandler } from "./controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", listFeatureFlagsHandler);

export default router;
