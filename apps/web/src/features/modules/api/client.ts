import { apiFetch } from "@/shared/api/http";
import type { Module } from "../types";

export async function listModules(userId: number): Promise<Module[]> {
  return apiFetch<Module[]>(`/projects/modules?userId=${encodeURIComponent(String(userId))}`);
}
