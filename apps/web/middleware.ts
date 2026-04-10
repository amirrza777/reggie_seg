import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type ApiUser = {
  role?: string;
  isStaff?: boolean;
  isAdmin?: boolean;
  isEnterpriseAdmin?: boolean;
  isUnassigned?: boolean;
};

const GUARDED_PREFIXES = ["/admin", "/staff", "/enterprise", "/dashboard/", "/modules", "/projects"] as const;
const GUARDED_PATHS = new Set(["/dashboard", "/calendar"]);
const STAFF_WORKSPACE_PREFIXES = ["/dashboard/", "/modules", "/projects"] as const;
const STAFF_WORKSPACE_PATHS = new Set(["/dashboard", "/calendar"]);

function matchesAnyPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => {
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix);
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function getDefaultPath(user: ApiUser): string {
  if (user.isUnassigned === true) return "/dashboard";
  if (user.role === "ADMIN" || user.isAdmin) return "/admin";
  if (user.role === "ENTERPRISE_ADMIN" || user.isEnterpriseAdmin) return "/enterprise";
  if (user.isStaff || user.role === "STAFF") return "/staff/dashboard";
  return "/dashboard";
}

function isGuardedPath(pathname: string): boolean {
  return GUARDED_PATHS.has(pathname) || matchesAnyPrefix(pathname, GUARDED_PREFIXES);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isGuardedPath(pathname)) {
    return NextResponse.next();
  }

  try {
    const cookieStr = req.headers.get("cookie") ?? "";
    const tfAccessToken =
      cookieStr
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("tf_access_token="))
        ?.slice("tf_access_token=".length) ?? null;

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        cookie: cookieStr,
        ...(tfAccessToken ? { Authorization: `Bearer ${tfAccessToken}` } : {}),
      },
      credentials: "include",
    });

    if (!meRes.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const user = (await meRes.json()) as ApiUser;
    if (user.isUnassigned === true && pathname !== "/dashboard") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const isAdmin = user.role === "ADMIN" || user.isAdmin === true;
    const isEnterpriseAdmin = user.role === "ENTERPRISE_ADMIN" || user.isEnterpriseAdmin === true;
    const isStaff = user.isStaff === true || user.role === "STAFF";
    const isStaffOnly = isStaff && !isAdmin && !isEnterpriseAdmin;

    if (pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL(getDefaultPath(user), req.url));
    }

    if (pathname.startsWith("/enterprise") && !(isEnterpriseAdmin || isAdmin)) {
      return NextResponse.redirect(new URL(getDefaultPath(user), req.url));
    }

    if (pathname.startsWith("/staff") && !(isStaff || isAdmin)) {
      return NextResponse.redirect(new URL(getDefaultPath(user), req.url));
    }

    if (isStaffOnly) {
      const isWorkspacePath =
        STAFF_WORKSPACE_PATHS.has(pathname) || matchesAnyPrefix(pathname, STAFF_WORKSPACE_PREFIXES);
      if (isWorkspacePath) {
        return NextResponse.redirect(new URL("/staff/dashboard", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/enterprise/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/modules/:path*",
    "/projects/:path*",
    "/calendar",
  ],
};
