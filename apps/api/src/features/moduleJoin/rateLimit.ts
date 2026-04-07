import type { Request } from "express";
import { rateLimit } from "../../shared/rateLimit.js";
import type { AuthRequest } from "../../auth/middleware.js";

const MODULE_JOIN_WINDOW_MS = 60 * 1000;
const MODULE_JOIN_MAX = 20;
const MODULE_JOIN_PREFIX = "module-join:join";

function moduleJoinClientKey(req: Request, prefix: string) {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.sub;
  const ip = req.ip ?? "unknown";
  if (typeof userId === "number") {
    return `${prefix}:user:${userId}:ip:${ip}`;
  }
  return `${prefix}:ip:${ip}`;
}

export const moduleJoinAttemptRateLimit = rateLimit({
  windowMs: MODULE_JOIN_WINDOW_MS,
  max: MODULE_JOIN_MAX,
  prefix: MODULE_JOIN_PREFIX,
  key: moduleJoinClientKey,
});
