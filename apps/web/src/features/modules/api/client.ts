import { apiFetch } from "@/shared/api/http";
import type { Module } from "../types";

export async function listModules(): Promise<Module[]> {
  return apiFetch<Module[]>("/modules");
}
