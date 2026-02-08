import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  try {
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      credentials: "include",
    });

    if (!meRes.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = (await meRes.json()) as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  } catch (_err) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
