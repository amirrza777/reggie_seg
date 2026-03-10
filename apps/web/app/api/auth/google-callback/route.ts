import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

const ACCESS_MAX_AGE = 15 * 60; // 15 minutes, aligned with access token TTL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const destination = searchParams.get("redirect") || "/dashboard";

  if (token) {
    const cookieStore = await cookies();
    cookieStore.set("tf_access_token", token, {
      path: "/",
      maxAge: ACCESS_MAX_AGE,
      sameSite: "lax",
      secure: true,
      httpOnly: false, // must be readable by client JS (getAccessToken reads document.cookie)
    });
  }

  redirect(destination);
}
