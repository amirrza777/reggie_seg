import { Router, type Request, type Response } from "express";
import passport from "passport";
import {
  acceptEnterpriseAdminInviteHandler,
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
  updateProfileHandler,
  requestEmailChangeHandler,
  confirmEmailChangeHandler,
  deleteAccountHandler,
  joinEnterpriseByCodeHandler,
  leaveEnterpriseHandler,
} from "./controller.js";
import { requireAuth, optionalAuth } from "./middleware.js";
import { configureGoogle } from "./google.js";
import { issueTokensForUser } from "./service.js";
import { rateLimit } from "../shared/rateLimit.js";

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: "auth:login" });
const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, prefix: "auth:signup" });
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, prefix: "auth:forgot" });
const enterpriseAdminInviteAcceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: "auth:enterprise-admin-invite-accept",
});

const router = Router();
const googleEnabled = configureGoogle();

type GoogleAuthUser = {
  id: number;
  email: string;
};

type GoogleCallbackRequest = Request & {
  user?: GoogleAuthUser;
};

router.post("/signup", signupLimiter, signupHandler);
router.post("/enterprise-admin/accept", enterpriseAdminInviteAcceptLimiter, acceptEnterpriseAdminInviteHandler);
router.post("/login", loginLimiter, loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotLimiter, forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.get("/me", optionalAuth, meHandler);
router.patch("/profile", requireAuth, updateProfileHandler);
router.post("/email-change/request", requireAuth, requestEmailChangeHandler);
router.post("/email-change/confirm", requireAuth, confirmEmailChangeHandler);
router.post("/account/delete", requireAuth, deleteAccountHandler);
router.post("/enterprise/join", requireAuth, joinEnterpriseByCodeHandler);
router.post("/enterprise/leave", requireAuth, leaveEnterpriseHandler);

if (googleEnabled) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
    async (req, res) => {
      const user = (req as GoogleCallbackRequest).user;
      if (!user) {
        return res.status(401).json({ error: "Google login failed" });
      }
      const { accessToken, refreshToken } = await issueTokensForUser(user.id, user.email);
      // Mirror the refresh cookie settings used in the regular login flow.
      const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
      const cookieSameSite: "lax" | "none" = cookieSecure ? "none" : "lax";
      const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        path: "/",
        domain: cookieDomain,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
      // Resolve the real landing space on the web app using /auth/me flags.
      const destination = "/app-home";
      res.redirect(`${appBaseUrl}/google/success?token=${encodeURIComponent(accessToken)}&redirect=${encodeURIComponent(destination)}`);
    }
  );

  router.get("/google/failure", (_req, res) => res.status(401).json({ error: "Google login failed" }));
} else {
  const unavailable = (_req: Request, res: Response) =>
    res.status(503).json({ error: "Google login is not configured on this server." });
  router.get("/google", unavailable);
  router.get("/google/callback", unavailable);
  router.get("/google/failure", unavailable);
}

export default router;
