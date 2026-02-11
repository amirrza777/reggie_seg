import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../shared/db.js";
import { randomBytes } from "crypto";
import { signUpWithProvider } from "./service.js";

export function configureGoogle() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_REDIRECT_URI;

  if (!clientID || !clientSecret || !callbackURL) {
    console.warn("Google OAuth not configured: missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("email missing"));
          const firstName = profile.name?.givenName ?? "";
          const lastName = profile.name?.familyName ?? "";
          const user = await signUpWithProvider({ email, firstName, lastName, provider: "google" });
          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}
