import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupSections } from "./StaffProjectManageSetupSections";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
}));

vi.mock("./StaffProjectManageSetupContext", () => ({
  StaffProjectManageSetupProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="setup-provider">{children}</div>
  ),
}));

vi.mock("./sections/StaffProjectManageProjectNameSection", () => ({
  StaffProjectManageProjectNameSection: () => <div data-testid="name-section" />,
}));
vi.mock("./sections/StaffProjectManageForumSection", () => ({
  StaffProjectManageForumSection: () => <div data-testid="forum-section" />,
}));
vi.mock("./sections/StaffProjectManageFeatureFlagsSection", () => ({
  StaffProjectManageFeatureFlagsSection: () => <div data-testid="flags-section" />,
}));
vi.mock("./sections/StaffProjectManageWarningsSection", () => ({
  StaffProjectManageWarningsSection: () => <div data-testid="warnings-section" />,
}));
vi.mock("./sections/StaffProjectManageArchiveOrDeleteSection", () => ({
  StaffProjectManageArchiveOrDeleteSection: () => <div data-testid="archive-section" />,
}));

const baseInitial: StaffProjectManageSummary = {
  id: 1,
  name: "Project",
  archivedAt: null,
  moduleId: 2,
  moduleArchivedAt: null,
};

describe("StaffProjectManageSetupSections", () => {
  it("renders editable description when the project and module are active", () => {
    render(
      <StaffProjectManageSetupSections
        projectId={1}
        initial={baseInitial}
        globalFeatureFlags={{}}
        warningsOk
        warningsConfig={{} as never}
        overviewHref="/staff/projects/1"
        discussionHref="/staff/projects/1/discussion"
        warningsTabHref="/staff/projects/1/warnings"
      />,
    );
    expect(
      screen.getByText(/Update project details, forum privacy, student tabs, and automatic warning configuration/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to project/i })).toHaveAttribute("href", "/staff/projects/1");
    expect(screen.getByTestId("name-section")).toBeInTheDocument();
  });

  it("renders read-only note when the project or module is archived", () => {
    render(
      <StaffProjectManageSetupSections
        projectId={1}
        initial={{ ...baseInitial, archivedAt: "2026-01-01T00:00:00.000Z" }}
        globalFeatureFlags={{}}
        warningsOk={false}
        warningsConfig={null}
        overviewHref="/o"
        discussionHref="/d"
        warningsTabHref="/w"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/read-only while this project is archived/i);
  });
});
