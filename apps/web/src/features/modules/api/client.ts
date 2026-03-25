import { apiFetch } from "@/shared/api/http";
import type { JoinModulePayload, JoinModuleResponse, Module } from "../types";

type ListModulesOptions = {
  scope?: "staff";
  compact?: boolean;
  query?: string;
};

export async function listModules(userId: number, options?: ListModulesOptions): Promise<Module[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.scope === "staff") {
    searchParams.set("scope", "staff");
  }
  if (options?.compact) {
    searchParams.set("compact", "1");
  }
  if (options?.query?.trim()) {
    searchParams.set("q", options.query.trim());
  }

  return apiFetch<Module[]>(`/projects/modules?${searchParams.toString()}`);
}

export async function joinModuleByCode(payload: JoinModulePayload): Promise<JoinModuleResponse> {
  return apiFetch<JoinModuleResponse>("/projects/modules/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
