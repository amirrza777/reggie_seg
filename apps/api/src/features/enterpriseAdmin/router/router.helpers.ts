import type { Response } from "express";
import type { EnterpriseRequest, EnterpriseUser } from "../types.js";

type ServiceErrorResult = {
  ok: false;
  status: number;
  error: string;
};

export function resolveEnterpriseContext(req: EnterpriseRequest, res: Response): EnterpriseUser | null {
  const enterpriseUser = req.enterpriseUser;
  if (!enterpriseUser) {
    res.status(500).json({ error: "Enterprise not resolved" });
    return null;
  }
  return enterpriseUser;
}

export function ensureEnterpriseAdmin(enterpriseUser: EnterpriseUser, res: Response): boolean {
  if (enterpriseUser.role === "ENTERPRISE_ADMIN" || enterpriseUser.role === "ADMIN") {
    return true;
  }
  res.status(403).json({ error: "Forbidden" });
  return false;
}

export function sendServiceError(res: Response, result: ServiceErrorResult) {
  return res.status(result.status).json({ error: result.error });
}
