import { Request, Response } from "express"
import { createTemplate, getTemplate, getAllTemplates, deleteTemplate,updateTemplate } from "./service"
import { IncomingQuestion } from "./types";

export async function createTemplateHandler(req: Request, res: Response) {
  const { templateName, questions } = req.body

  if (!templateName || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid request body" })
  }

  try {
    const template = await createTemplate(templateName, questions)
    res.json({ ok: true, templateID: template.id })
  } catch (error) {
    console.error("Error creating questionnaire template:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export async function getTemplateHandler(req: Request, res: Response) {
  const id = Number(req.params.id)

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid template ID" })
  }

  const template = await getTemplate(id)

  if (!template) {
    return res.status(404).json({ error: "Template wasn't found" })
  }

  res.json(template)
}

export async function getAllTemplatesHandler(req: Request, res: Response){
  try {
    const templates = await getAllTemplates();
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export async function updateTemplateHandler(req: Request, res: Response) {
  const templateId = Number(req.params.id);
  const { templateName, questions } = req.body as {
    templateName: string;
    questions: IncomingQuestion[];
  };

  if (isNaN(templateId)) {
    return res.status(400).json({ error: "Invalid questionnaire template ID" });
  }
  if (!templateName || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    await updateTemplate(templateId, templateName, questions);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error updating questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteTemplateHandler(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid questionnaire template ID" });
  }

  try {
    await deleteTemplate(id);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error deleting questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
