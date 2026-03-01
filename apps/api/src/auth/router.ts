import { Router } from "express";
import passport from "passport";
import {
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
} from "./controller.js";
import { requireAuth } from "./middleware.js";
import { configureGoogle } from "./google.js";
import { issueTokensForUser } from "./service.js";

const router = Router();
const googleEnabled = configureGoogle();

router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.get("/me", meHandler);
router.patch("/profile", requireAuth, updateProfileHandler);
router.post("/email-change/request", requireAuth, requestEmailChangeHandler);
router.post("/email-change/confirm", requireAuth, confirmEmailChangeHandler);

if (googleEnabled) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
    async (req, res) => {
      const user: any = (req as any).user;
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
      res.redirect(`${appBaseUrl}/modules`);
    }
  );

  router.get("/google/failure", (_req, res) => res.status(401).json({ error: "Google login failed" }));
} else {
  const unavailable = (_req: any, res: any) =>
    res.status(503).json({ error: "Google login is not configured on this server." });
  router.get("/google", unavailable);
  router.get("/google/callback", unavailable);
  router.get("/google/failure", unavailable);
}

export default router;
