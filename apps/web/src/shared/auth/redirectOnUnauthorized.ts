import { ApiError } from "@/shared/api/errors";
import { redirect } from "next/navigation";

/**
 * Redirect to login when an API call fails due to an expired/missing session.
 * Returns true when a redirect was triggered (function never returns in that path).
 */
export function redirectOnUnauthorized(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 401) {
    redirect("/login");
  }
  return false;
}

