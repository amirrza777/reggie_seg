import { Router } from "express"
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  getMyTemplatesHandler,
  getPublicTemplatesFromOtherUsersHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller.js"

const router = Router()

router.get("/", getAllTemplatesHandler);
router.get("/mine", getMyTemplatesHandler);
router.get("/public/others", getPublicTemplatesFromOtherUsersHandler);
router.post("/new", createTemplateHandler);
router.get("/:id", getTemplateHandler);
router.put("/:id", updateTemplateHandler);
router.delete("/:id", deleteTemplateHandler);

export default router;
