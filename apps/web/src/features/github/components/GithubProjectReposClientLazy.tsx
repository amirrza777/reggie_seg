"use client";

import dynamic from "next/dynamic";

const GithubProjectReposClientDynamic = dynamic(
  () => import("./GithubProjectReposClient").then((module) => module.GithubProjectReposClient),
  {
    ssr: false,
    loading: () => <p className="muted">Loading repository insights...</p>,
  }
);

type GithubProjectReposClientLazyProps = {
  projectId: string;
};

export function GithubProjectReposClientLazy({ projectId }: GithubProjectReposClientLazyProps) {
  return <GithubProjectReposClientDynamic projectId={projectId} />;
}
