import { apiFetch } from "@/shared/api/http";
import type { AuthResponse, LoginCredentials } from "../types";

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
