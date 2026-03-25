import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/github/components/GithubProjectReposClient", () => ({
  GithubProjectReposClient: ({ projectId }: { projectId: string }) => (
    <div data-testid="repos-client">repos:{projectId}</div>
  ),
}));

import ProjectReposPage from "./(app)/projects/[projectId]/repos/page";

describe("ProjectReposPage", () => {
  it("resolves route params and renders repos client", async () => {
    const view = await ProjectReposPage({ params: Promise.resolve({ projectId: "p-123" }) });
    render(view);
    expect(screen.getByTestId("repos-client")).toHaveTextContent("repos:p-123");
  });
});
