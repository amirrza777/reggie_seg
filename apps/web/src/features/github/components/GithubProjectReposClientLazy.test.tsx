import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";

const dynamicState = vi.hoisted(() => ({
  loader: null as null | (() => Promise<unknown>),
  options: null as null | { ssr?: boolean; loading?: () => JSX.Element },
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options: { ssr?: boolean; loading?: () => JSX.Element }) => {
    dynamicState.loader = loader;
    dynamicState.options = options;

    return ({ projectId }: { projectId: string }) => <div data-testid="lazy-client" data-project-id={projectId} />;
  },
}));

vi.mock("./GithubProjectReposClient", () => ({
  GithubProjectReposClient: ({ projectId }: { projectId: string }) => (
    <div data-testid="github-project-repos-client" data-project-id={projectId} />
  ),
}));

import { GithubProjectReposClientLazy } from "./GithubProjectReposClientLazy";

describe("GithubProjectReposClientLazy", () => {
  it("passes projectId to the dynamically loaded client", () => {
    render(<GithubProjectReposClientLazy projectId="project-91" />);

    expect(screen.getByTestId("lazy-client")).toHaveAttribute("data-project-id", "project-91");
  });

  it("configures dynamic import without SSR and with loading fallback", () => {
    expect(dynamicState.loader).toBeTypeOf("function");
    expect(dynamicState.options?.ssr).toBe(false);

    const loading = dynamicState.options?.loading?.();
    render(loading ?? null);
    expect(screen.getByText("Loading repository insights...")).toBeInTheDocument();
  });

  it("resolves the dynamic loader to the real client component", async () => {
    const loadedComponent = await dynamicState.loader?.();
    expect(loadedComponent).toBeTypeOf("function");

    const Loaded = loadedComponent as ComponentType<{ projectId: string }>;
    render(<Loaded projectId="from-loader" />);

    expect(screen.getByTestId("github-project-repos-client")).toHaveAttribute("data-project-id", "from-loader");
  });
});
