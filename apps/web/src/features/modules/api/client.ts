import { apiFetch } from "@/shared/api/http";
import type { Module } from "../types";

type ListModulesOptions = {
  scope?: "staff";
  compact?: boolean;
};

export async function listModules(userId: number, options?: ListModulesOptions): Promise<Module[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.scope === "staff") {
    searchParams.set("scope", "staff");
  }
  if (options?.compact) {
    searchParams.set("compact", "1");
  }

  return apiFetch<Module[]>(`/projects/modules?${searchParams.toString()}`);
}
