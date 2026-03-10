import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_MAX_AGE = 15 * 60; // 15 minutes, aligned with access token TTL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const destination = searchParams.get("redirect") || "/dashboard";

  const response = NextResponse.redirect(new URL(destination, req.url));

  if (token) {
    response.cookies.set("tf_access_token", token, {
      path: "/",
      maxAge: ACCESS_MAX_AGE,
      sameSite: "lax",
      secure: true,
      httpOnly: false, // must stay readable by client JS (getAccessToken reads document.cookie)
    });
  }

  return response;
}
