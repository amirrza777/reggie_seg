import { apiFetch } from "@/shared/api/http";
import type {
  GithubConnectionStatus,
  GithubLatestSnapshot,
  GithubMappingCoverage,
  GithubRepositoryOption,
  ProjectGithubRepoLink,
} from "../types";

export async function getGithubConnectionStatus(): Promise<GithubConnectionStatus> {
  return apiFetch<GithubConnectionStatus>("/github/me");
}

export async function getGithubOAuthConnectUrl(returnTo?: string) {
  const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return apiFetch<{ url: string }>(`/github/oauth/connect${query}`);
}

export async function listGithubRepositories(): Promise<GithubRepositoryOption[]> {
  const response = await apiFetch<{ repos: GithubRepositoryOption[] }>("/github/repos");
  return response.repos;
}

export async function listProjectGithubRepoLinks(projectId: number): Promise<ProjectGithubRepoLink[]> {
  const response = await apiFetch<{ links: ProjectGithubRepoLink[] }>(
    `/github/project-repos?projectId=${projectId}`
  );
  return response.links;
}

export async function linkGithubRepositoryToProject(payload: {
  projectId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string;
  defaultBranch: string | null;
}) {
  return apiFetch<{
    link: {
      id: number;
      projectId: number;
      githubRepositoryId: number;
      linkedByUserId: number;
      isActive: boolean;
      autoSyncEnabled: boolean;
      syncIntervalMinutes: number;
      createdAt: string;
      updatedAt: string;
    };
    repository: {
      id: number;
      githubRepoId: number;
      ownerLogin: string;
      name: string;
      fullName: string;
      htmlUrl: string;
      isPrivate: boolean;
      defaultBranch: string | null;
    };
    snapshot: {
      id: number;
      analysedAt: string;
      createdAt: string;
    };
  }>("/github/project-repos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLatestProjectGithubSnapshot(linkId: number): Promise<GithubLatestSnapshot> {
  return apiFetch<GithubLatestSnapshot>(`/github/project-repos/${linkId}/latest-snapshot`);
}

export async function getProjectGithubMappingCoverage(linkId: number): Promise<GithubMappingCoverage> {
  const response = await apiFetch<{ mappingCoverage: GithubMappingCoverage }>(
    `/github/project-repos/${linkId}/mapping-coverage`
  );
  return response.mappingCoverage;
}

export async function disconnectGithubAccount() {
  return apiFetch<{ disconnected: boolean; alreadyDisconnected: boolean }>("/github/me", {
    method: "DELETE",
  });
}

export async function removeProjectGithubRepoLink(linkId: number) {
  return apiFetch<{
    removed: {
      id: number;
      projectId: number;
      githubRepositoryId: number;
      isActive: boolean;
      autoSyncEnabled: boolean;
      nextSyncAt: string | null;
      updatedAt: string;
    };
  }>(`/github/project-repos/${linkId}`, {
    method: "DELETE",
  });
}
