import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // Add auth/RBAC or tenant checks here in the future.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
