import { Router } from "express";
import { getCalendarEventsHandler } from "./controller.js";

const router = Router();

router.get("/events", getCalendarEventsHandler);

export default router;
