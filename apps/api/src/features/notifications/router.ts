import { Router } from "express";
import {
  listNotificationsHandler,
  countUnreadHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  deleteNotificationHandler,
} from "./controller.js";

const router = Router();

router.get("/", listNotificationsHandler);
router.get("/unread-count", countUnreadHandler);
router.patch("/:id/read", markAsReadHandler);
router.post("/read-all", markAllAsReadHandler);
router.delete("/:id", deleteNotificationHandler);

export default router;
