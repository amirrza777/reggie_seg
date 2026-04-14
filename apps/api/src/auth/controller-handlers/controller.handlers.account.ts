/* eslint-disable max-lines-per-function, max-statements, complexity */
import type { Response } from "express";
import type { AuthRequest } from "../middleware.js";
import {
  confirmEmailChange,
  deleteAccount,
  getProfile,
  joinEnterpriseByCode,
  leaveEnterprise,
  requestEmailChange,
  updateProfile,
} from "../service.js";
import {
  parseConfirmEmailChangeBody,
  parseDeleteAccountBody,
  parseJoinEnterpriseBody,
  parseRequestEmailChangeBody,
  parseUpdateProfileBody,
} from "../controller.parsers.js";
import { prisma } from "../../shared/db.js";
import {
  deriveRoleFlags,
  findMeUser,
  getErrorCode,
  isEnterpriseCodeUnassigned,
  respondWithErrorDetail,
  resolveAuthenticatedUserId,
  clearRefreshCookie,
} from "./controller.handlers.shared.js";

/** Handles requests for update profile. */
export async function updateProfileHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseUpdateProfileBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const profile = await updateProfile({ userId, ...parsedBody.value });
    return res.json(profile);
  } catch (error: unknown) {
    console.error("update profile error", error);
    return respondWithErrorDetail(res, 500, "update profile failed", error);
  }
}

/** Handles requests for request email change. */
export async function requestEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseRequestEmailChangeBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await requestEmailChange({ userId, newEmail: parsedBody.value.newEmail });
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("email change request error", error);
    if (getErrorCode(error) === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already in use" });
    }
    return respondWithErrorDetail(res, 500, "email change request failed", error);
  }
}

/** Handles requests for confirm email change. */
export async function confirmEmailChangeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseConfirmEmailChangeBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await confirmEmailChange({ userId, ...parsedBody.value });
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("email change confirm error", error);
    if (getErrorCode(error) === "INVALID_EMAIL_CODE") {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    return respondWithErrorDetail(res, 500, "email change confirm failed", error);
  }
}

/** Handles requests for delete account. */
export async function deleteAccountHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseDeleteAccountBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    await deleteAccount({ userId, password: parsedBody.value.password });
    clearRefreshCookie(res);
    return res.json({ success: true });
  } catch (error: unknown) {
    console.error("delete account error", error);
    const code = getErrorCode(error);
    if (code === "INVALID_PASSWORD") {
      return res.status(401).json({ error: "Invalid password" });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    if (code === "ACCOUNT_DELETE_FORBIDDEN") {
      return res.status(403).json({ error: "Account deletion is not allowed for this account" });
    }
    return respondWithErrorDetail(res, 500, "delete account failed", error);
  }
}

/** Handles requests for joining an enterprise using a code. */
export async function joinEnterpriseByCodeHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsedBody = parseJoinEnterpriseBody(req.body);
  if (!parsedBody.ok) {
    return res.status(400).json({ error: parsedBody.error });
  }

  try {
    const result = await joinEnterpriseByCode({ userId, enterpriseCode: parsedBody.value.enterpriseCode });
    return res.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("join enterprise by code error", error);
    const code = getErrorCode(error);
    if (code === "ENTERPRISE_CODE_REQUIRED") {
      return res.status(400).json({ error: "Enterprise code is required" });
    }
    if (code === "ENTERPRISE_NOT_FOUND") {
      return res.status(404).json({ error: "Enterprise code not found" });
    }
    if (code === "ENTERPRISE_ACCESS_BLOCKED") {
      return res.status(403).json({ error: "Your account is blocked by that enterprise. Please email your enterprise admin." });
    }
    if (code === "ENTERPRISE_JOIN_NOT_ALLOWED") {
      return res.status(403).json({ error: "Enterprise rejoin is only available when enterprise access is required." });
    }
    if (code === "ACCOUNT_SUSPENDED") {
      return res.status(403).json({ error: "Account suspended" });
    }
    if (code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "This email is already in use for that enterprise." });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    return respondWithErrorDetail(res, 500, "join enterprise failed", error);
  }
}

/** Handles requests for leaving the current enterprise. */
export async function leaveEnterpriseHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await leaveEnterprise({ userId });
    return res.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("leave enterprise error", error);
    const code = getErrorCode(error);
    if (code === "ALREADY_UNASSIGNED") {
      return res.status(400).json({ error: "This account is already unassigned from an enterprise." });
    }
    if (code === "ACCOUNT_LEAVE_FORBIDDEN") {
      return res.status(403).json({ error: "Leaving enterprise is not allowed for this account." });
    }
    if (code === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    return respondWithErrorDetail(res, 500, "leave enterprise failed", error);
  }
}

/** Handles requests for me. */
export async function meHandler(req: AuthRequest, res: Response) {
  const userId = await resolveAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await findMeUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (user.active === false) {
      await prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
      return res.status(403).json({ error: "Account is suspended" });
    }

    const profile = await getProfile(user.id);
    const role = user.role;
    const roleFlags = deriveRoleFlags(role, user._count?.moduleLeads ?? 0, user._count?.moduleTeachingAssistants ?? 0);

    return res.json({
      ...profile,
      enterpriseName: user.enterprise.name,
      isUnassigned: isEnterpriseCodeUnassigned(user.enterprise.code),
      ...roleFlags,
      role,
      active: user.active ?? true,
    });
  } catch (error) {
    console.error("meHandler error", error);
    return res.status(401).json({ error: "Not authenticated" });
  }
}
