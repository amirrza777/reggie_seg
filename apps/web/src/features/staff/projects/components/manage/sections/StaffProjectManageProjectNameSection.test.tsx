import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupProvider } from "../StaffProjectManageSetupContext";
import { StaffProjectManageProjectNameSection } from "./StaffProjectManageProjectNameSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const patchMock = vi.fn();
vi.mock("@/features/projects/api/client", () => ({
  patchStaffProjectManage: (...a: unknown[]) => patchMock(...a),
  deleteStaffProjectManage: vi.fn(),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleFormFields", () => ({
  CharacterCount: () => null,
}));

vi.mock("../../StaffProjectManageFormCollapsible", () => ({
  StaffProjectManageFormCollapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const initial: StaffProjectManageSummary = {
  id: 1,
  name: "Old",
  archivedAt: null,
  moduleId: 2,
  moduleArchivedAt: null,
  questionnaireTemplateId: 3,
  questionnaireTemplate: { id: 3, templateName: "Tpl" },
  projectDeadline: {
    taskOpenDate: "2026-01-01T00:00:00.000Z",
    taskDueDate: "2026-01-15T00:00:00.000Z",
    taskDueDateMcf: "2026-01-22T00:00:00.000Z",
    assessmentOpenDate: "2026-01-16T00:00:00.000Z",
    assessmentDueDate: "2026-01-30T00:00:00.000Z",
    assessmentDueDateMcf: "2026-02-06T00:00:00.000Z",
    feedbackOpenDate: "2026-01-31T00:00:00.000Z",
    feedbackDueDate: "2026-02-14T00:00:00.000Z",
    feedbackDueDateMcf: "2026-02-21T00:00:00.000Z",
    teamAllocationQuestionnaireOpenDate: null,
    teamAllocationQuestionnaireDueDate: null,
  },
  hasSubmittedPeerAssessments: false,
  informationText: null,
  projectAccess: {
    moduleLeaders: [],
    moduleTeachingAssistants: [],
    moduleMemberDirectory: [],
    projectStudentIds: [],
  },
  canMutateProjectSettings: true,
};

describe("StaffProjectManageProjectNameSection", () => {
  it("submits a new name from the form", async () => {
    const user = userEvent.setup();
    patchMock.mockResolvedValue({ ...initial, name: "New" });
    render(
      <StaffProjectManageSetupProvider projectId={1} initial={initial}>
        <StaffProjectManageProjectNameSection />
      </StaffProjectManageSetupProvider>,
    );
    const input = screen.getByRole("textbox", { name: "Project name" });
    await user.clear(input);
    await user.type(input, "New");
    await user.click(screen.getByRole("button", { name: /Save project name/i }));
    expect(patchMock).toHaveBeenCalledWith(1, { name: "New" });
  });
});
