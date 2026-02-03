import { Router } from "express";
import {
  listMeetingsHandler,
  getMeetingHandler,
  createMeetingHandler,
  deleteMeetingHandler,
  markAttendanceHandler,
  saveMinutesHandler,
  getMinutesHandler,
  addCommentHandler,
  deleteCommentHandler,
} from "./controller.js";

const router = Router();

router.get("/team/:teamId", listMeetingsHandler);
router.get("/:meetingId", getMeetingHandler);
router.post("/", createMeetingHandler);
router.delete("/:meetingId", deleteMeetingHandler);
router.put("/:meetingId/attendance", markAttendanceHandler);
router.put("/:meetingId/minutes", saveMinutesHandler);
router.get("/:meetingId/minutes", getMinutesHandler);
router.post("/:meetingId/comments", addCommentHandler);
router.delete("/comments/:commentId", deleteCommentHandler);

export default router;
