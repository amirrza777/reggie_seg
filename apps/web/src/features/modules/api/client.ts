import { apiFetch } from "@/shared/api/http";
import type { Module } from "../types";

type ListModulesOptions = {
  scope?: "staff";
};

export async function listModules(userId: number, options?: ListModulesOptions): Promise<Module[]> {
  const searchParams = new URLSearchParams({ userId: String(userId) });
  if (options?.scope === "staff") {
    searchParams.set("scope", "staff");
  }

  return apiFetch<Module[]>(`/projects/modules?${searchParams.toString()}`);
}
