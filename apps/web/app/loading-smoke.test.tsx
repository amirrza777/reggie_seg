import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminLoading from "./(admin)/loading";
import AppLoading from "./(app)/loading";
import DashboardLoading from "./(app)/dashboard/loading";
import ModuleDetailLoading from "./(app)/modules/[moduleId]/loading";
import ModulesLoading from "./(app)/modules/loading";
import ProjectDiscussionLoading from "./(app)/projects/[projectId]/discussion/loading";
import ProjectLoading from "./(app)/projects/[projectId]/loading";
import ProjectReposLoading from "./(app)/projects/[projectId]/repos/loading";
import ProjectTrelloLoading from "./(app)/projects/[projectId]/trello/loading";
import ProjectsLoading from "./(app)/projects/loading";
import StaffDiscussionLoading from "./(app)/staff/projects/[projectId]/discussion/loading";
import StaffTeamLoading from "./(app)/staff/projects/[projectId]/teams/[teamId]/loading";
import StaffTeamTrelloLoading from "./(app)/staff/projects/[projectId]/teams/[teamId]/trello/loading";
import StaffMarksLoading from "./(app)/staff/marks/loading";
import StaffModuleWorkspaceLoading from "./(app)/staff/modules/[moduleId]/loading";
import StaffModuleProjectsLoading from "./(app)/staff/modules/[moduleId]/projects/loading";
import StaffQuestionnairesLoading from "./(app)/staff/questionnaires/loading";
import StaffReposLoading from "./(app)/staff/repos/loading";
import EnterpriseForumReportsLoading from "./(enterprise)/enterprise/forum-reports/loading";
import EnterpriseLoading from "./(enterprise)/loading";
import HelpLoading from "./help/loading";

const loadingComponents = [
  AdminLoading,
  AppLoading,
  DashboardLoading,
  ModuleDetailLoading,
  ModulesLoading,
  ProjectDiscussionLoading,
  ProjectLoading,
  ProjectReposLoading,
  ProjectTrelloLoading,
  ProjectsLoading,
  StaffDiscussionLoading,
  StaffTeamLoading,
  StaffTeamTrelloLoading,
  StaffMarksLoading,
  StaffModuleWorkspaceLoading,
  StaffModuleProjectsLoading,
  StaffQuestionnairesLoading,
  StaffReposLoading,
  EnterpriseForumReportsLoading,
  EnterpriseLoading,
  HelpLoading,
];

describe("route loading components", () => {
  it.each(loadingComponents)("renders %p as a status skeleton", (Component) => {
    render(<Component />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
