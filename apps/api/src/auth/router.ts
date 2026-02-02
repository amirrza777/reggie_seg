import { Router } from "express";
import passport from "passport";
import { signupHandler, loginHandler, refreshHandler, logoutHandler } from "./controller.js";
import { configureGoogle } from "./google.js";
import { issueTokensForUser } from "./service.js";

const router = Router();
configureGoogle();

router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/google/failure" }),
  async (req, res) => {
    const user: any = (req as any).user;
    const { accessToken, refreshToken } = await issueTokensForUser(user.id, user.email);
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    res.redirect("http://localhost:3001/modules");
  }
);

router.get("/google/failure", (_req, res) => res.status(401).json({ error: "Google login failed" }));

export default router;