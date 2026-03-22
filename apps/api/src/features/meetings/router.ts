import { Router } from "express";
import {
  listMeetingsHandler,
  getMeetingHandler,
  createMeetingHandler,
  updateMeetingHandler,
  deleteMeetingHandler,
  markAttendanceHandler,
  saveMinutesHandler,
  getMinutesHandler,
  addCommentHandler,
  deleteCommentHandler,
  getMeetingSettingsHandler,
} from "./controller.js";

const router = Router();

router.get("/team/:teamId", listMeetingsHandler);
router.get("/:meetingId", getMeetingHandler);
router.post("/", createMeetingHandler);
router.patch("/:meetingId", updateMeetingHandler);
router.delete("/:meetingId", deleteMeetingHandler);
router.put("/:meetingId/attendance", markAttendanceHandler);
router.put("/:meetingId/minutes", saveMinutesHandler);
router.get("/:meetingId/minutes", getMinutesHandler);
router.post("/:meetingId/comments", addCommentHandler);
router.delete("/comments/:commentId", deleteCommentHandler);
router.get("/:meetingId/settings", getMeetingSettingsHandler);

export default router;
