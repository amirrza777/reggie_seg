import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AdminRouteSkeleton,
  DashboardRouteSkeleton,
  DiscussionRouteSkeleton,
  EnterpriseForumReportsRouteSkeleton,
  EnterpriseRouteSkeleton,
  GenericAppRouteSkeleton,
  GithubReposRouteSkeleton,
  HelpRouteSkeleton,
  ModuleDetailRouteSkeleton,
  ProjectsListRouteSkeleton,
  ProjectWorkspaceRouteSkeleton,
  StaffDiscussionRouteSkeleton,
  StaffProjectsRouteSkeleton,
  StaffQuestionnairesRouteSkeleton,
  TrelloRouteSkeleton,
} from "./FeatureRouteSkeletons";

describe("FeatureRouteSkeletons", () => {
  it("renders all route skeleton variants", () => {
    const variants: Array<JSX.Element> = [
      <DiscussionRouteSkeleton key="discussion" />,
      <StaffDiscussionRouteSkeleton key="staff-discussion" />,
      <TrelloRouteSkeleton key="trello" />,
      <GithubReposRouteSkeleton key="github-repos" />,
      <StaffQuestionnairesRouteSkeleton key="staff-questionnaires" />,
      <EnterpriseForumReportsRouteSkeleton key="forum-reports" />,
      <DashboardRouteSkeleton key="dashboard" />,
      <ModuleDetailRouteSkeleton key="module-detail" />,
      <ProjectWorkspaceRouteSkeleton key="project-workspace" />,
      <ProjectsListRouteSkeleton key="projects-list" />,
      <StaffProjectsRouteSkeleton key="staff-projects" />,
      <GenericAppRouteSkeleton key="generic" />,
      <AdminRouteSkeleton key="admin" />,
      <EnterpriseRouteSkeleton key="enterprise" />,
      <HelpRouteSkeleton key="help" />,
    ];

    variants.forEach((view) => render(view));

    expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(variants.length);
    expect(screen.getAllByText("Loading discussion content").length).toBeGreaterThan(0);
    expect(screen.getByText("Loading repository analytics")).toBeInTheDocument();
    expect(screen.getByText("Loading module details")).toBeInTheDocument();
    expect(screen.getByText("Loading admin content")).toBeInTheDocument();
    expect(screen.getByText("Loading enterprise content")).toBeInTheDocument();
    expect(screen.getByText("Loading help content")).toBeInTheDocument();
  });
});
