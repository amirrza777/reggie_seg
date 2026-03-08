import { Router } from "express";
import {
  listNotificationsHandler,
  countUnreadHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} from "./controller.js";

const router = Router();

router.get("/", listNotificationsHandler);
router.get("/unread-count", countUnreadHandler);
router.patch("/:id/read", markAsReadHandler);
router.post("/read-all", markAllAsReadHandler);

export default router;
