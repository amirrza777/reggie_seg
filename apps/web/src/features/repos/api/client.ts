import { apiFetch } from "@/shared/api/http";
import type { Repository, Commit } from "../types";

export async function linkRepository(payload: Pick<Repository, "name" | "url">): Promise<Repository> {
  return apiFetch<Repository>("/repos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCommits(repoId: string): Promise<Commit[]> {
  return apiFetch<Commit[]>(`/repos/${repoId}/commits`);
}
