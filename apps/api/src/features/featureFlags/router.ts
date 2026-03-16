import { Router } from "express";
import { listFeatureFlagsHandler } from "./controller.js";

const router = Router();

router.get("/", listFeatureFlagsHandler);

export default router;
