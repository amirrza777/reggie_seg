import type { Request, Response } from "express"
import {
  createTemplate,
  getTemplate,
  getAllTemplates,
  getMyTemplates,
  getPublicTemplatesFromOtherUsers,
  deleteTemplate,
  updateTemplate,
  usePublicTemplate,
} from "./service.js"
import type { IncomingQuestion } from "./types.js";
import jwt from "jsonwebtoken";
import { verifyRefreshToken } from "../../auth/service.js";
import type { AuthRequest } from "../../auth/middleware.js";
import { parseSearchQuery } from "../../shared/search.js";
import {
  parseCreateOrUpdateTemplateBody,
  parseOptionalQuestionnairePurposeQuery,
  parseQuestionnaireTemplateId,
} from "./controller.parsers.js";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";

type AccessPayload = { sub: number; email?: string };

function parseAccessPayload(payload: string | jwt.JwtPayload): AccessPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const sub = payload.sub;
  const email = payload.email;
  if (typeof sub !== "number" || !Number.isFinite(sub)) return null;
  if (email !== undefined && (typeof email !== "string" || email.length === 0)) return null;
  return email !== undefined ? { sub, email } : { sub };
}

function resolveUserId(req: AuthRequest): number | null {
  if (req.user?.sub) return req.user.sub;

  const auth = req.headers?.authorization || "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (accessToken) {
    try {
      const verified = jwt.verify(accessToken, accessSecret);
      const payload = parseAccessPayload(verified);
      if (payload?.sub) return payload.sub;
    } catch {
      //Access token invalid or expired
      //continue and try refresh token
    }
  }

  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) return null;
  try {
    const payload = verifyRefreshToken(refreshToken);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

/** Handles requests for create template. */
export async function createTemplateHandler(req: AuthRequest, res: Response) {
  const parsedBody = parseCreateOrUpdateTemplateBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error })

  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const visibility = typeof parsedBody.value.isPublic === "boolean" ? parsedBody.value.isPublic : true;
    const template =
      parsedBody.value.purpose === undefined
        ? await createTemplate(
            parsedBody.value.templateName,
            parsedBody.value.questions as IncomingQuestion[],
            userId,
            visibility,
          )
        : await createTemplate(
            parsedBody.value.templateName,
            parsedBody.value.questions as IncomingQuestion[],
            userId,
            visibility,
            parsedBody.value.purpose,
          );
    res.json({ ok: true, templateID: template.id, userId, isPublic: visibility })
  } catch (error) {
    console.error("Error creating questionnaire template:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

/** Handles requests for get template. */
export async function getTemplateHandler(req: AuthRequest, res: Response) {
  const id = parseQuestionnaireTemplateId(req.params.id, "Invalid template ID")
  if (!id.ok) return res.status(400).json({ error: id.error })

  const requesterUserId = resolveUserId(req);
  const template = await getTemplate(id.value, requesterUserId)

  if (!template) {
    return res.status(404).json({ error: "Template wasn't found" })
  }

  const canEdit = Boolean(requesterUserId && template.ownerId === requesterUserId);
  res.json({ ...template, canEdit })
}

function requireRequesterUserId(req: Request): number {
  const requesterUserId = resolveUserId(req as AuthRequest);
  if (!requesterUserId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return requesterUserId;
}

/** Handles requests for get all templates. */
export async function getAllTemplatesHandler(req: Request, res: Response){
  try {
    const requesterUserId = resolveUserId(req as AuthRequest);
    const templates = await getAllTemplates(requesterUserId);
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** Handles requests for get my templates. */
export async function getMyTemplatesHandler(req: Request, res: Response) {
  try {
    const requesterUserId = requireRequesterUserId(req);
    const parsedSearchQuery = parseSearchQuery((req as AuthRequest).query?.q);
    if (!parsedSearchQuery.ok) {
      return res.status(400).json({ error: parsedSearchQuery.error });
    }
    const parsedPurpose = parseOptionalQuestionnairePurposeQuery((req as AuthRequest).query?.purpose);
    if (!parsedPurpose.ok) {
      return res.status(400).json({ error: parsedPurpose.error });
    }
    const templates =
      parsedSearchQuery.value || parsedPurpose.value
        ? await getMyTemplates(requesterUserId, {
            ...(parsedSearchQuery.value ? { query: parsedSearchQuery.value } : {}),
            ...(parsedPurpose.value ? { purpose: parsedPurpose.value } : {}),
          })
        : await getMyTemplates(requesterUserId);
    res.json(templates);
  } catch (error) {
    if ((error as any).statusCode === 401) return res.status(401).json({ error: "Unauthorized" });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for get public templates from other users. */
export async function getPublicTemplatesFromOtherUsersHandler(req: Request, res: Response) {
  try {
    const requesterUserId = requireRequesterUserId(req);
    const parsedPurpose = parseOptionalQuestionnairePurposeQuery((req as AuthRequest).query?.purpose);
    if (!parsedPurpose.ok) {
      return res.status(400).json({ error: parsedPurpose.error });
    }
    const templates =
      parsedPurpose.value === undefined
        ? await getPublicTemplatesFromOtherUsers(requesterUserId)
        : await getPublicTemplatesFromOtherUsers(requesterUserId, {
            purpose: parsedPurpose.value,
          });
    res.json(templates);
  } catch (error) {
    if ((error as any).statusCode === 401) return res.status(401).json({ error: "Unauthorized" });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for update template. */
export async function updateTemplateHandler(req: Request, res: Response) {
  const templateId = parseQuestionnaireTemplateId(req.params.id);
  if (!templateId.ok) return res.status(400).json({ error: templateId.error });
  const parsedBody = parseCreateOrUpdateTemplateBody(req.body);
  if (!parsedBody.ok) return res.status(400).json({ error: parsedBody.error });

  try {
    const requesterUserId = requireRequesterUserId(req);
    if (parsedBody.value.purpose === undefined) {
      await updateTemplate(
        requesterUserId,
        templateId.value,
        parsedBody.value.templateName,
        parsedBody.value.questions as IncomingQuestion[],
        parsedBody.value.isPublic,
      );
    } else {
      await updateTemplate(
        requesterUserId,
        templateId.value,
        parsedBody.value.templateName,
        parsedBody.value.questions as IncomingQuestion[],
        parsedBody.value.isPublic,
        parsedBody.value.purpose,
      );
    }
    res.json({ ok: true });
  } catch (error: any) {
    if (error.statusCode === 401) return res.status(401).json({ error: "Unauthorized" });
    if (error.statusCode === 403) return res.status(403).json({ error: "Forbidden" });
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error updating questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for delete template. */
export async function deleteTemplateHandler(req: Request, res: Response) {
  const id = parseQuestionnaireTemplateId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });

  try {
    const requesterUserId = requireRequesterUserId(req);
    await deleteTemplate(requesterUserId, id.value);
    res.json({ ok: true });
  } catch (error: any) {
    if (error.statusCode === 401) return res.status(401).json({ error: "Unauthorized" });
    if (error.statusCode === 403) return res.status(403).json({ error: "Forbidden" });
    if (error.code === "TEMPLATE_IN_USE") {
      return res.status(409).json({ error: "Questionnaire template is currently in use and cannot be deleted" });
    }
    if (error.code === "P2003") {
      return res.status(409).json({ error: "Questionnaire template is currently in use and cannot be deleted" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Questionnaire template not found" });
    }
    console.error("Error deleting questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Handles requests for use template. */
export async function useTemplateHandler(req: Request, res: Response) {
  const id = parseQuestionnaireTemplateId(req.params.id);
  if (!id.ok) return res.status(400).json({ error: id.error });

  try {
    const requesterUserId = requireRequesterUserId(req);
    const copied = await usePublicTemplate(requesterUserId, id.value);
    if (!copied) return res.status(404).json({ error: "Public questionnaire template not found" });
    res.json({ ok: true, templateID: copied.id });
  } catch (error: any) {
    if (error.statusCode === 401) return res.status(401).json({ error: "Unauthorized" });
    console.error("Error copying questionnaire template:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}