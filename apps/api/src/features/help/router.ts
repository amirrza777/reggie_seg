import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { searchHelpHandler } from "./controller.js";

const router = Router();

router.use(requireAuth);
router.post("/search", searchHelpHandler);

export default router;
