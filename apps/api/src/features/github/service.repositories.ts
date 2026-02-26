import { getGitHubApiConfig } from "./config.js";
import {
  deactivateProjectGithubRepositoryLink,
  findActiveProjectGithubRepositoryLink,
  deleteGithubAccountByUserId,
  findGithubAccountStatusByUserId,
  findGithubAccountByUserId,
  isUserInProject,
  listProjectGithubRepositoryLinks,
  upsertGithubRepository,
  upsertProjectGithubRepositoryLink,
} from "./repo.js";
import { getValidGithubAccessToken } from "./oauth.service.js";
import { GithubServiceError } from "./errors.js";
import { analyseProjectGithubRepository } from "./service.analysis.run.js";

type GithubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  owner?: {
    login?: string;
  };
};

type GithubRepositoryListItem = {
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string | null;
  defaultBranch: string | null;
};

async function fetchUserRepositories(accessToken: string) {
  return fetchGitHubAppUserRepositories(accessToken);
}

type GithubInstallationListResponse = {
  installations: Array<{ id: number }>;
};

type GithubInstallationReposResponse = {
  repositories: GithubRepoResponse[];
};

async function fetchGitHubAppUserRepositories(accessToken: string) {
  const { baseUrl } = getGitHubApiConfig();
  const repositoryById = new Map<number, GithubRepoResponse>();
  let installationPage = 1;
  let totalInstallations = 0;

  while (true) {
    const installationsResponse = await fetch(
      `${baseUrl}/user/installations?per_page=100&page=${installationPage}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!installationsResponse.ok) {
      if (installationsResponse.status === 401) {
        throw new GithubServiceError(401, "GitHub access token is invalid or expired");
      }
      throw new GithubServiceError(502, "Failed to fetch GitHub App installations");
    }

    const installationsData = (await installationsResponse.json()) as GithubInstallationListResponse;
    const installations = installationsData.installations || [];
    totalInstallations += installations.length;

    for (const installation of installations) {
      let repoPage = 1;
      while (true) {
        const reposResponse = await fetch(
          `${baseUrl}/user/installations/${installation.id}/repositories?per_page=100&page=${repoPage}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${accessToken}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        if (!reposResponse.ok) {
          if (reposResponse.status === 403 || reposResponse.status === 404) {
            break;
          }
          throw new GithubServiceError(502, "Failed to fetch repositories for GitHub App installation");
        }

        const reposData = (await reposResponse.json()) as GithubInstallationReposResponse;
        const repositories = reposData.repositories || [];
        for (const repository of repositories) {
          repositoryById.set(repository.id, repository);
        }

        if (repositories.length < 100) {
          break;
        }
        repoPage += 1;
        if (repoPage > 10) {
          break;
        }
      }
    }

    if (installations.length < 100) {
      break;
    }
    installationPage += 1;
    if (installationPage > 5) {
      break;
    }
  }

  if (totalInstallations === 0) {
    throw new GithubServiceError(
      403,
      "GitHub App is connected but not installed on any account or organization. Install the app, then try again."
    );
  }

  return Array.from(repositoryById.values());
}

export async function listGithubRepositoriesForUser(userId: number) {
  const account = await findGithubAccountByUserId(userId);
  if (!account) {
    throw new GithubServiceError(404, "GitHub account is not connected");
  }

  const accessToken = await getValidGithubAccessToken(account);
  const repositories = await fetchUserRepositories(accessToken);

  return repositories.map((repo): GithubRepositoryListItem => ({
    githubRepoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    isPrivate: repo.private,
    ownerLogin: repo.owner?.login || null,
    defaultBranch: repo.default_branch || null,
  }));
}

export async function getGithubConnectionStatus(userId: number) {
  const account = await findGithubAccountStatusByUserId(userId);
  if (!account) {
    return {
      connected: false,
      account: null,
    };
  }

  return {
    connected: true,
    account,
  };
}

export async function disconnectGithubAccount(userId: number) {
  const account = await findGithubAccountStatusByUserId(userId);
  if (!account) {
    return { disconnected: true, alreadyDisconnected: true };
  }

  await deleteGithubAccountByUserId(userId);
  return { disconnected: true, alreadyDisconnected: false };
}

type LinkGithubRepositoryToProjectInput = {
  projectId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  ownerLogin: string;
  defaultBranch: string | null;
};

export async function linkGithubRepositoryToProject(userId: number, input: LinkGithubRepositoryToProjectInput) {
  const isMember = await isUserInProject(userId, input.projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  const existingActiveLink = await findActiveProjectGithubRepositoryLink(input.projectId);
  if (existingActiveLink) {
    throw new GithubServiceError(
      409,
      `This project already has a linked repository (${existingActiveLink.repository.fullName}). Remove it before linking another one.`
    );
  }

  const repository = await upsertGithubRepository({
    githubRepoId: BigInt(input.githubRepoId),
    ownerLogin: input.ownerLogin,
    name: input.name,
    fullName: input.fullName,
    htmlUrl: input.htmlUrl,
    isPrivate: input.isPrivate,
    defaultBranch: input.defaultBranch,
  });

  const link = await upsertProjectGithubRepositoryLink(input.projectId, repository.id, userId);
  let snapshot;
  try {
    snapshot = await analyseProjectGithubRepository(userId, link.id);
  } catch (error) {
    // If auto-analysis fails, deactivate the fresh link so user can retry linking.
    await deactivateProjectGithubRepositoryLink(link.id).catch(() => {
      // best effort rollback; original analysis error is the actionable one
    });
    if (error instanceof GithubServiceError) {
      throw error;
    }
    throw new GithubServiceError(502, "Repository linked but analysis failed. Please try linking again.");
  }

  return {
    link,
    repository,
    snapshot,
  };
}

export async function listProjectGithubRepositories(userId: number, projectId: number) {
  const isMember = await isUserInProject(userId, projectId);
  if (!isMember) {
    throw new GithubServiceError(403, "You are not a member of this project");
  }

  return listProjectGithubRepositoryLinks(projectId);
}
