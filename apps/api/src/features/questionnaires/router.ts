import { Router } from "express"
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller"
import nodeHttp = require("node:http");

const router = Router()

//returns all existing templates with questions
router.get("/", getAllTemplatesHandler);
router.post("/", createTemplateHandler);
router.get("/:id", getTemplateHandler);
router.put("/:id", updateTemplateHandler);
router.delete("/:id", deleteTemplateHandler);

export default router;
