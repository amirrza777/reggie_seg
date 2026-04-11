import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectWarningsConfig } from "@/features/projects/types";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupProvider } from "../StaffProjectManageSetupContext";
import { StaffProjectManageArchiveOrDeleteSection } from "./StaffProjectManageArchiveOrDeleteSection";
import { StaffProjectManageFeatureFlagsSection } from "./StaffProjectManageFeatureFlagsSection";
import { StaffProjectManageForumSection } from "./StaffProjectManageForumSection";
import { StaffProjectManageWarningsSection } from "./StaffProjectManageWarningsSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/projects/api/client", () => ({
  patchStaffProjectManage: vi.fn().mockImplementation(async () => {
    throw new Error("unused");
  }),
  deleteStaffProjectManage: vi.fn(),
}));

vi.mock("../../StaffProjectManageFormCollapsible", () => ({
  StaffProjectManageFormCollapsible: ({ title, children }: { title: string; children: ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

vi.mock("@/features/staff/projects/warnings/components/ConfigureWarningPanel", () => ({
  ConfigureWarningPanel: () => <div data-testid="configure-warnings" />,
}));

vi.mock("@/features/forum/components/ForumSettingsCard", () => ({
  ForumSettingsCard: () => <div data-testid="forum-settings" />,
}));

vi.mock("../../StaffProjectNavFlagsPanel", () => ({
  StaffProjectNavFlagsPanel: () => <div data-testid="nav-flags" />,
}));

const baseInitial: StaffProjectManageSummary = {
  id: 1,
  name: "P",
  archivedAt: null,
  moduleId: 99,
  moduleArchivedAt: null,
};

function withProvider(ui: React.ReactElement, initial: StaffProjectManageSummary = baseInitial) {
  return <StaffProjectManageSetupProvider projectId={1} initial={initial}>{ui}</StaffProjectManageSetupProvider>;
}

describe("StaffProjectManageWarningsSection", () => {
  it("shows ConfigureWarningPanel when config loaded", () => {
    render(
      withProvider(
        <StaffProjectManageWarningsSection
          warningsOk
          warningsConfig={{ rules: [] } as unknown as ProjectWarningsConfig}
          warningsTabHref="/w"
        />,
      ),
    );
    expect(screen.getByTestId("configure-warnings")).toBeInTheDocument();
  });

  it("shows fallback copy when warnings failed to load", () => {
    render(withProvider(<StaffProjectManageWarningsSection warningsOk={false} warningsConfig={null} warningsTabHref="/w" />));
    expect(screen.getByText(/Could not load warning configuration/i)).toBeInTheDocument();
  });
});

describe("StaffProjectManageForumSection", () => {
  it("renders forum settings card", () => {
    render(withProvider(<StaffProjectManageForumSection discussionHref="/d" />));
    expect(screen.getByTestId("forum-settings")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open discussion forum/i })).toHaveAttribute("href", "/d");
  });
});

describe("StaffProjectManageFeatureFlagsSection", () => {
  it("renders nav flags panel", () => {
    render(withProvider(<StaffProjectManageFeatureFlagsSection globalFeatureFlags={{ a: true }} />));
    expect(screen.getByTestId("nav-flags")).toBeInTheDocument();
  });
});

describe("StaffProjectManageArchiveOrDeleteSection", () => {
  it("shows module archived guidance", () => {
    render(
      withProvider(<StaffProjectManageArchiveOrDeleteSection />, {
        ...baseInitial,
        moduleArchivedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    expect(screen.getByText(/This module is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage module/i })).toHaveAttribute("href", "/staff/modules/99/manage");
  });

  it("shows archive project copy when active", () => {
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />));
    expect(screen.getByRole("heading", { level: 3, name: "Archive project" })).toBeInTheDocument();
  });

  it("shows unarchive project when project is archived", () => {
    render(
      withProvider(<StaffProjectManageArchiveOrDeleteSection />, {
        ...baseInitial,
        archivedAt: "2026-02-01T00:00:00.000Z",
      }),
    );
    expect(screen.getByRole("heading", { level: 3, name: "Unarchive project" })).toBeInTheDocument();
  });
});
