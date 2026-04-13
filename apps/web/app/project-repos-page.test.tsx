import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 55 }),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn().mockResolvedValue({ teamAllocationQuestionnaireTemplateId: null }),
  getTeamByUserAndProject: vi.fn().mockResolvedValue({ id: 10 }),
}));

vi.mock("@/features/github/components/repos/GithubProjectReposClient", () => ({
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
