import passport from "passport";
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from "passport-google-oauth20";
import { signUpWithProvider } from "./service.js";
import { prisma } from "../shared/db.js";

async function handleGoogleVerify(profile: Profile, done: VerifyCallback) {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error("email missing"));
    }
    const hasExistingAccount = Boolean(
      await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
        select: { id: true },
      }),
    );
    const firstName = profile.name?.givenName ?? "";
    const lastName = profile.name?.familyName ?? "";
    const user = await signUpWithProvider({ email, firstName, lastName, provider: "google" });
    const needsCode = !hasExistingAccount;
    return done(null, { id: user.id, email: user.email, needsEnterpriseCode: needsCode });
  } catch (error) {
    return done(error);
  }
}

/** Configures Google authentication when the required environment variables are available. */
export function configureGoogle(): boolean {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_REDIRECT_URI;

  if (!clientID || !clientSecret || !callbackURL) {
    console.warn("Google OAuth not configured: missing GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI");
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        return handleGoogleVerify(profile, done);
      }
    )
  );

  return true;
}