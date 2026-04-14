import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectNav } from "./ProjectNav";

const pathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

describe("ProjectNav", () => {
  beforeEach(() => {
    pathnameMock.mockReset();
  });

  it("marks overview as active on base route", () => {
    pathnameMock.mockReturnValue("/projects/77");
    render(<ProjectNav projectId="77" />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });

  it("marks nested section links as active", () => {
    pathnameMock.mockReturnValue("/projects/77/meetings/1");
    render(<ProjectNav projectId="77" />);
    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute("aria-current", "page");
  });

  it("filters links by feature flags when provided", () => {
    pathnameMock.mockReturnValue("/projects/77");
    render(
      <ProjectNav
        projectId="77"
        enabledFlags={{
          peer_feedback: false,
          repos: true,
          trello: false,
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: "Peer Feedback" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Repositories" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Trello" })).not.toBeInTheDocument();
  });
});
