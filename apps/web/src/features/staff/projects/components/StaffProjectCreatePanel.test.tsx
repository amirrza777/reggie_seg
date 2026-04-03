import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { StaffProjectCreatePanel } from "./StaffProjectCreatePanel";
import { createStaffProject } from "@/features/projects/api/client";
import { getModuleStudents, listModules } from "@/features/modules/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/shared/lib/search", () => ({
  SEARCH_DEBOUNCE_MS: 0,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/projects/api/client", () => ({
  createStaffProject: vi.fn(),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
  getModuleStudents: vi.fn(),
}));

vi.mock("@/features/questionnaires/api/client", () => ({
  getMyQuestionnaires: vi.fn(),
}));

const createStaffProjectMock = createStaffProject as MockedFunction<typeof createStaffProject>;
const listModulesMock = listModules as MockedFunction<typeof listModules>;
const getModuleStudentsMock = getModuleStudents as MockedFunction<typeof getModuleStudents>;
const getMyQuestionnairesMock = getMyQuestionnaires as MockedFunction<typeof getMyQuestionnaires>;

describe("StaffProjectCreatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockReset();
    refresh.mockReset();

    listModulesMock.mockResolvedValue([
      { id: "42", title: "Software Engineering", accountRole: "OWNER" },
    ] as never);
    getModuleStudentsMock.mockResolvedValue({
      students: [
        {
          id: 101,
          email: "student@example.com",
          firstName: "Sample",
          lastName: "Student",
          active: true,
          enrolled: true,
        },
      ],
    } as never);
    getMyQuestionnairesMock.mockResolvedValue([
      { id: 12, templateName: "Team Feedback Template", purpose: "PEER_ASSESSMENT" },
      { id: 18, templateName: "Allocation Setup", purpose: "CUSTOMISED_ALLOCATION" },
    ] as never);
    createStaffProjectMock.mockResolvedValue({
      id: 77,
      name: "Release Project",
      moduleId: 42,
    } as never);
  });

  it("submits trimmed project data and redirects on success", async () => {
    render(
      <StaffProjectCreatePanel
        modules={[{ id: "42", title: "Software Engineering", accountRole: "OWNER" } as never]}
        modulesError={null}
      />,
    );

    await waitFor(() => expect(getMyQuestionnairesMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("option", { name: "Team Feedback Template" })).toBeInTheDocument());

    const [templateSelect] = screen.getAllByRole("combobox");

    fireEvent.change(screen.getByPlaceholderText(/software engineering group project/i), {
      target: { value: "  Release Project  " },
    });
    fireEvent.change(templateSelect, {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByPlaceholderText(/add project expectations/i), {
      target: { value: "  Important guidance for the cohort.  " },
    });

    fireEvent.submit(screen.getByRole("button", { name: /create project/i }).closest("form")!);

    await waitFor(() => {
      expect(createStaffProjectMock).toHaveBeenCalledTimes(1);
    });

    const payload = createStaffProjectMock.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      name: "Release Project",
      moduleId: 42,
      questionnaireTemplateId: 12,
      informationText: "Important guidance for the cohort.",
    });
    expect(payload?.deadline.taskOpenDate).toContain("T");
    expect(payload?.deadline.feedbackDueDateMcf).toContain("T");

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/staff/modules/42");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows validation feedback when deadline ordering is invalid", async () => {
    render(
      <StaffProjectCreatePanel
        modules={[{ id: "42", title: "Software Engineering", accountRole: "OWNER" } as never]}
        modulesError={null}
      />,
    );

    await waitFor(() => expect(getMyQuestionnairesMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("option", { name: "Team Feedback Template" })).toBeInTheDocument());

    const [templateSelect] = screen.getAllByRole("combobox");

    fireEvent.change(screen.getByPlaceholderText(/software engineering group project/i), {
      target: { value: "Broken Project" },
    });
    fireEvent.change(templateSelect, {
      target: { value: "12" },
    });

    const taskOpenInput = screen.getByLabelText(/task opens/i);
    const taskDueInput = screen.getByLabelText(/^task due$/i);
    fireEvent.change(taskOpenInput, { target: { value: "2026-04-10T09:00" } });
    fireEvent.change(taskDueInput, { target: { value: "2026-04-09T09:00" } });

    fireEvent.submit(screen.getByRole("button", { name: /create project/i }).closest("form")!);

    expect(await screen.findByText("Task open must be before task due.")).toBeInTheDocument();
    expect(createStaffProjectMock).not.toHaveBeenCalled();
  });
});
