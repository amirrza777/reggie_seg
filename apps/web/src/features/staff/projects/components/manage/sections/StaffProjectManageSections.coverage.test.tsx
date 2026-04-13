import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { ApiError } from "@/shared/api/errors";
import { StaffProjectManageSetupProvider } from "../StaffProjectManageSetupContext";
import { StaffProjectManageArchiveOrDeleteSection } from "./StaffProjectManageArchiveOrDeleteSection";
import { StaffProjectManageInfoBoardSection } from "./StaffProjectManageInfoBoardSection";
import { StaffProjectManagePeerTemplateSection } from "./StaffProjectManagePeerTemplateSection";
import { StaffProjectManageProjectAccessSection } from "./StaffProjectManageProjectAccessSection";
import { StaffProjectManageProjectDeadlinesSection } from "./StaffProjectManageProjectDeadlinesSection";

const { patchMock, deleteMock, getMyQuestionnairesMock } = vi.hoisted(() => ({
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
  getMyQuestionnairesMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/features/projects/api/client", () => ({
  patchStaffProjectManage: (...args: unknown[]) => patchMock(...args),
  deleteStaffProjectManage: (...args: unknown[]) => deleteMock(...args),
}));

vi.mock("@/features/questionnaires/api/client", () => ({
  getMyQuestionnaires: (...args: unknown[]) => getMyQuestionnairesMock(...args),
}));

vi.mock("../../StaffProjectManageFormCollapsible", () => ({
  StaffProjectManageFormCollapsible: ({ title, children }: { title: string; children: ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

vi.mock("@/features/modules/components/ModuleAccessSearchSection", () => ({
  ModuleAccessSearchSection: (props: {
    users: { id: number; email: string; firstName: string; lastName: string }[];
    selectedSet: Set<number>;
    onToggle: (userId: number, checked: boolean) => void;
    isCheckedDisabled?: (user: { id: number; email: string; firstName: string; lastName: string; active: boolean }) => boolean;
    onToggleOnlyWithoutModuleAccess: () => void;
    onlyWithoutModuleAccessDisabled: boolean;
    onSearchChange: (value: string) => void;
    onPageInputChange: (value: string) => void;
    onPageInputBlur: () => void;
    onCommitPageJump: () => void;
    noResultsLabel: (query: string) => string;
    onNextPage?: () => void;
    onPreviousPage?: () => void;
    page?: number;
    totalPages?: number;
  }) => (
    <div>
      <span aria-label="student-page">{props.page ?? 1}</span>
      <span aria-label="student-total-pages">{props.totalPages ?? 1}</span>
      <button type="button" aria-label="student-previous-page" onClick={() => props.onPreviousPage?.()}>
        prev
      </button>
      <button type="button" aria-label="student-next-page" onClick={() => props.onNextPage?.()}>
        next
      </button>
      <button
        type="button"
        aria-label="access-props-smoke"
        onClick={() => {
          props.onSearchChange("q");
          props.onPageInputChange("2");
          props.onPageInputBlur();
          props.onCommitPageJump();
          void props.noResultsLabel("qq");
          void props.isCheckedDisabled?.({
            id: 1,
            email: "a@x.com",
            firstName: "",
            lastName: "",
            active: true,
          });
        }}
      >
        smoke
      </button>
      <button type="button" aria-label="raw-toggle-unknown" onClick={() => props.onToggle(999, true)}>
        add-unknown
      </button>
      <button type="button" aria-label="raw-toggle-ghost" onClick={() => props.onToggle(888, false)}>
        remove-ghost
      </button>
      {props.users.map((u) => {
        const disabled = props.isCheckedDisabled
          ? props.isCheckedDisabled({
              ...u,
              active: true,
            })
          : false;
        return (
          <label key={u.id}>
            <input
              type="checkbox"
              aria-label={`access-${u.id}`}
              checked={props.selectedSet.has(u.id)}
              disabled={disabled}
              onChange={(e) => props.onToggle(u.id, e.target.checked)}
            />
            {u.email}
          </label>
        );
      })}
      <button
        type="button"
        aria-label="toggle-hide-already-on-project"
        disabled={props.onlyWithoutModuleAccessDisabled}
        onClick={props.onToggleOnlyWithoutModuleAccess}
      >
        filter
      </button>
    </div>
  ),
}));

function buildDeadlineSnapshot(
  overrides: Partial<NonNullable<StaffProjectManageSummary["projectDeadline"]>> = {},
): NonNullable<StaffProjectManageSummary["projectDeadline"]> {
  return {
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
    ...overrides,
  };
}

function buildInitial(overrides: Partial<StaffProjectManageSummary> = {}): StaffProjectManageSummary {
  return {
    id: 1,
    name: "Project",
    archivedAt: null,
    moduleId: 99,
    moduleArchivedAt: null,
    questionnaireTemplateId: 10,
    questionnaireTemplate: { id: 10, templateName: "Current peer" },
    projectDeadline: buildDeadlineSnapshot(),
    hasSubmittedPeerAssessments: false,
    informationText: "Hello",
    projectAccess: {
      moduleLeaders: [{ id: 1, email: "lead-only@x.com", firstName: "", lastName: "" }],
      moduleTeachingAssistants: [],
      moduleMemberDirectory: [
        { id: 10, email: "a@x.com", firstName: "Ann", lastName: "Alpha" },
        { id: 11, email: "b@x.com", firstName: "Ben", lastName: "Beta" },
      ],
      projectStudentIds: [10],
    },
    ...overrides,
  };
}

function withProvider(ui: React.ReactElement, initial: StaffProjectManageSummary = buildInitial()) {
  return <StaffProjectManageSetupProvider projectId={1} initial={initial}>{ui}</StaffProjectManageSetupProvider>;
}

const peerA: Questionnaire = {
  id: 10,
  templateName: "Peer A",
  purpose: "PEER_ASSESSMENT",
} as Questionnaire;

const peerB: Questionnaire = {
  id: 20,
  templateName: "Peer B",
  purpose: "PEER_ASSESSMENT",
} as Questionnaire;

beforeEach(() => {
  patchMock.mockReset();
  deleteMock.mockReset();
  getMyQuestionnairesMock.mockReset();
});

function largeModuleDirectory(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: 200 + i,
    email: `student${i}@x.com`,
    firstName: "Stu",
    lastName: `${i}`,
  }));
}

describe("StaffProjectManageInfoBoardSection coverage", () => {
  it("initialises from null informationText and syncs when the prop changes", () => {
    const { rerender } = render(
      withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: null })),
    );
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("");
    rerender(withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: "Synced" })));
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("Synced");
    rerender(
      withProvider(
        <StaffProjectManageInfoBoardSection />,
        { ...buildInitial(), informationText: undefined } as StaffProjectManageSummary,
      ),
    );
    expect(screen.getByRole("textbox", { name: /information board text/i })).toHaveValue("");
  });

  it("saves a cleared board as null and shows the saving label while the request runs", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: StaffProjectManageSummary) => void;
    patchMock.mockReturnValueOnce(
      new Promise<StaffProjectManageSummary>((r) => {
        resolvePatch = r;
      }),
    );
    const initial = buildInitial({ informationText: "Will clear" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    await user.clear(ta);
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!({ ...initial, informationText: null });
    await waitFor(() => expect(screen.getByRole("button", { name: /^save information board$/i })).toBeInTheDocument());
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { informationText: null }));
  });

  it("saves changes and handles API errors", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({ informationText: "Hello" });
    patchMock.mockResolvedValueOnce({ ...initial, informationText: "Updated" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    await user.clear(ta);
    await user.type(ta, "Updated");
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { informationText: "Updated" }));
    expect(await screen.findByText(/information board updated/i)).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new ApiError("bad"));
    await user.type(ta, "x");
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText("bad")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("boom"));
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/could not save information board/i)).toBeInTheDocument();
  });

  it("shows no-op message when text matches initial", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({ informationText: "Same" });
    render(withProvider(<StaffProjectManageInfoBoardSection />, initial));
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than max length", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageInfoBoardSection />, buildInitial({ informationText: "" })));
    const ta = screen.getByRole("textbox", { name: /information board text/i });
    fireEvent.change(ta, { target: { value: `${"x".repeat(8000)}y` } });
    await user.click(screen.getByRole("button", { name: /save information board/i }));
    expect(await screen.findByText(/use at most 8000 characters/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });
});

describe("StaffProjectManagePeerTemplateSection coverage", () => {
  it("loads templates, saves a new selection, and shows validation errors", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    const initial = buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } });
    patchMock.mockResolvedValueOnce({ ...initial, questionnaireTemplateId: 20, questionnaireTemplate: { id: 20, templateName: "Peer B" } });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { questionnaireTemplateId: 20 }));

    await user.selectOptions(screen.getByRole("combobox"), "10");
    patchMock.mockRejectedValueOnce(new ApiError("tpl"));
    await user.selectOptions(screen.getByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText("tpl")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("x"));
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/could not update template/i)).toBeInTheDocument();
  });

  it("shows no-op message when selection matches initial template id", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    const initial = buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    await user.click(await screen.findByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("shows load error, non-Error rejection, loading state, and current-template option when missing from peer list", async () => {
    getMyQuestionnairesMock.mockRejectedValueOnce(new Error("network"));
    const { unmount } = render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({
          questionnaireTemplateId: 5,
          questionnaireTemplate: { id: 5, templateName: "Legacy" },
        }),
      ),
    );
    expect(await screen.findByText("network")).toBeInTheDocument();
    unmount();

    getMyQuestionnairesMock.mockRejectedValueOnce("weird");
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({
          questionnaireTemplateId: 5,
          questionnaireTemplate: { id: 5, templateName: "Legacy" },
        }),
      ),
    );
    expect(await screen.findByText(/failed to load your questionnaires/i)).toBeInTheDocument();
    cleanup();

    let resolveLoad!: (value: Questionnaire[]) => void;
    const loadPromise = new Promise<Questionnaire[]>((r) => {
      resolveLoad = r;
    });
    getMyQuestionnairesMock.mockReturnValueOnce(loadPromise);
    render(withProvider(<StaffProjectManagePeerTemplateSection />, buildInitial({ questionnaireTemplateId: 10 })));
    expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
    resolveLoad!([peerB]);
    const combo = await screen.findByRole("combobox");
    expect(within(combo).getByRole("option", { name: "Current peer (current)" })).toBeInTheDocument();
  });

  it("shows archived read-only copy and submission-locked copy", async () => {
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ archivedAt: "2026-01-01T00:00:00.000Z" }),
      ),
    );
    expect(await screen.findByText(/read-only because this project is archived/i)).toBeInTheDocument();

    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ hasSubmittedPeerAssessments: true }),
      ),
    );
    expect(await screen.findByText(/locked because peer assessments have already been submitted/i)).toBeInTheDocument();
  });

  it("shows unknown template name when the server snapshot omits the template row", async () => {
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ questionnaireTemplate: null }),
      ),
    );
    expect(await screen.findByText(/unknown template/i)).toBeInTheDocument();
  });

  it("rejects invalid template id", async () => {
    const user = userEvent.setup();
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA]);
    const initial = buildInitial({
      questionnaireTemplateId: -1,
      questionnaireTemplate: { id: -1, templateName: "Bad" },
    });
    render(withProvider(<StaffProjectManagePeerTemplateSection />, initial));
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(await screen.findByText(/choose a questionnaire template/i)).toBeInTheDocument();
  });

  it("shows saving label while template patch is pending", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: StaffProjectManageSummary) => void;
    patchMock.mockReturnValueOnce(
      new Promise<StaffProjectManageSummary>((r) => {
        resolvePatch = r;
      }),
    );
    getMyQuestionnairesMock.mockResolvedValueOnce([peerA, peerB]);
    render(
      withProvider(
        <StaffProjectManagePeerTemplateSection />,
        buildInitial({ questionnaireTemplateId: 10, questionnaireTemplate: { id: 10, templateName: "Peer A" } }),
      ),
    );
    await user.selectOptions(await screen.findByRole("combobox"), "20");
    await user.click(screen.getByRole("button", { name: /save template/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!(buildInitial({ questionnaireTemplateId: 20, questionnaireTemplate: { id: 20, templateName: "Peer B" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^save template$/i })).toBeInTheDocument());
  });
});

describe("StaffProjectManageProjectAccessSection coverage", () => {
  it("invokes search and pagination prop callbacks wired from the access section", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /access-props-smoke/i }));
  });

  it("shows staff summaries and module links", () => {
    const initial = buildInitial({
      projectAccess: {
        ...buildInitial().projectAccess,
        moduleLeaders: [{ id: 42, email: "", firstName: "", lastName: "" }],
      },
    });
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    expect(screen.getByText(/user 42/i)).toBeInTheDocument();
    expect(screen.getByText(/none assigned on this module/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit staff access/i })).toHaveAttribute("href", "/staff/modules/99/manage");
  });

  it("adds a student, saves, and shows enrollment link in review", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/adding \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("Ben Beta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open module student enrollment/i })).toHaveAttribute(
      "href",
      "/staff/modules/99/students/access",
    );

    patchMock.mockResolvedValueOnce({ ...initial, projectAccess: { ...initial.projectAccess, projectStudentIds: [10, 11] } });
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(1, { projectStudentIds: [10, 11] }));
    expect(await screen.findByText(/project access saved/i)).toBeInTheDocument();
  });

  it("removes a baseline student from the project", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectAccess: {
        ...buildInitial().projectAccess,
        projectStudentIds: [10, 11],
      },
    });
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/removing \(1\)/i)).toBeInTheDocument();
  });

  it("shows no student access changes on review when selection matches baseline", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/no changes to project student access/i)).toBeInTheDocument();
  });

  it("surfaces API and generic errors when saving access", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectAccessSection />, initial));
    await user.click(screen.getByRole("checkbox", { name: /access-11/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    patchMock.mockRejectedValueOnce(new ApiError("denied"));
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    expect(await screen.findByText("denied")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("x"));
    await user.click(screen.getByRole("button", { name: /save project access/i }));
    expect(await screen.findByText(/could not save project access/i)).toBeInTheDocument();
  });

  it("returns to editing from review and toggles hide filter", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    await user.click(screen.getByRole("button", { name: /back to editing/i }));
    await user.click(screen.getByRole("button", { name: /toggle-hide-already-on-project/i }));
  });

  it("shows User id fallback when an id is missing from the directory map", async () => {
    const user = userEvent.setup();
    render(withProvider(<StaffProjectManageProjectAccessSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /raw-toggle-unknown/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText("User 999")).toBeInTheDocument();
  });

  it("shows User id fallback for removals not present in the directory map", async () => {
    const user = userEvent.setup();
    render(
      withProvider(
        <StaffProjectManageProjectAccessSection />,
        buildInitial({
          projectAccess: {
            ...buildInitial().projectAccess,
            projectStudentIds: [10, 11, 888],
          },
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: /raw-toggle-ghost/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));
    expect(screen.getByText(/removing \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("User 888")).toBeInTheDocument();
  });

  it("invokes student list pagination controls", async () => {
    const user = userEvent.setup();
    const directory = largeModuleDirectory(25);
    render(
      withProvider(
        <StaffProjectManageProjectAccessSection />,
        buildInitial({
          projectAccess: {
            ...buildInitial().projectAccess,
            moduleMemberDirectory: directory,
            projectStudentIds: [200],
          },
        }),
      ),
    );
    expect(screen.getByLabelText("student-total-pages")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-next-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-next-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /student-previous-page/i }));
    expect(screen.getByLabelText("student-page")).toHaveTextContent("1");
  });
});

describe("StaffProjectManageProjectDeadlinesSection coverage", () => {
  it("shows empty state when no deadline snapshot exists", () => {
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, buildInitial({ projectDeadline: null })));
    expect(screen.getByText(/no project deadline record is available/i)).toBeInTheDocument();
  });

  it("maps null ISO fields to empty inputs", () => {
    render(
      withProvider(
        <StaffProjectManageProjectDeadlinesSection />,
        buildInitial({
          projectDeadline: buildDeadlineSnapshot({
            taskOpenDate: null,
            teamAllocationQuestionnaireOpenDate: "not-a-date",
          }),
        }),
      ),
    );
    const taskOpens = screen.getByLabelText(/^task opens$/i);
    expect(taskOpens).toHaveValue("");
  });

  it("validates required deadlines, saves, and surfaces errors", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const taskOpens = screen.getByLabelText(/^task opens$/i);
    await user.clear(taskOpens);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText(/each required deadline must have a valid date and time/i)).toBeInTheDocument();

    fireEvent.change(taskOpens, { target: { value: "2026-01-01T00:00" } });
    patchMock.mockResolvedValueOnce(initial);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(await screen.findByText(/project deadlines updated/i)).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new ApiError("nope"));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText("nope")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("z"));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText(/could not save deadlines/i)).toBeInTheDocument();
  });

  it("shows saving label while patch is pending", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: StaffProjectManageSummary) => void;
    patchMock.mockReturnValueOnce(
      new Promise<StaffProjectManageSummary>((r) => {
        resolvePatch = r;
      }),
    );
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!(buildInitial());
    await waitFor(() => expect(screen.getByRole("button", { name: /^save deadlines$/i })).toBeInTheDocument());
  });

  it("persists optional team allocation dates when both fields are valid", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectDeadline: buildDeadlineSnapshot({
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: null,
      }),
    });
    patchMock.mockImplementation(async (_id, body: { deadline: Record<string, unknown> }) => {
      expect(body.deadline.teamAllocationQuestionnaireOpenDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(body.deadline.teamAllocationQuestionnaireDueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      return initial;
    });
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    fireEvent.change(within(teamAllocFieldset).getByLabelText(/^opens$/i), { target: { value: "2026-04-01T09:00" } });
    fireEvent.change(within(teamAllocFieldset).getByLabelText(/^due$/i), { target: { value: "2026-04-02T17:00" } });
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });

  it("allows invalid optional team allocation strings in the payload when core dates are valid", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    patchMock.mockResolvedValueOnce(initial);
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    const openField = within(teamAllocFieldset).getByLabelText(/^opens$/i);
    fireEvent.change(openField, { target: { value: "  not-a-date  " } });
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });

  it("stores optional team allocation dates as null when cleared", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectDeadline: buildDeadlineSnapshot({
        teamAllocationQuestionnaireOpenDate: "2026-03-01T12:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-03-02T12:00:00.000Z",
      }),
    });
    patchMock.mockImplementation(async (_id, body: { deadline: Record<string, unknown> }) => {
      expect(body.deadline.teamAllocationQuestionnaireOpenDate).toBeNull();
      expect(body.deadline.teamAllocationQuestionnaireDueDate).toBeNull();
      return initial;
    });
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    const openField = within(teamAllocFieldset).getByLabelText(/^opens$/i);
    const dueField = within(teamAllocFieldset).getByLabelText(/^due$/i);
    await user.clear(openField);
    await user.clear(dueField);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });
});

describe("StaffProjectManageArchiveOrDeleteSection coverage", () => {
  it("shows pending label while archive request runs", async () => {
    const user = userEvent.setup();
    let resolveArchive!: (v: StaffProjectManageSummary) => void;
    patchMock.mockImplementationOnce(
      () =>
        new Promise<StaffProjectManageSummary>((r) => {
          resolveArchive = r;
        }),
    );
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, buildInitial()));
    const archiveSection = screen.getByRole("heading", { name: "Archive project" }).closest("div")!;
    await user.click(within(archiveSection).getByRole("checkbox"));
    await user.click(within(archiveSection).getByRole("button", { name: /archive project/i }));
    expect(within(archiveSection).getByRole("button", { name: /updating/i })).toBeInTheDocument();
    resolveArchive!(buildInitial({ archivedAt: "2026-04-01T00:00:00.000Z" }));
    await waitFor(() =>
      expect(within(archiveSection).queryByRole("button", { name: /updating/i })).not.toBeInTheDocument(),
    );
  });

  it("shows pending label while unarchive request runs", async () => {
    const user = userEvent.setup();
    let resolveUnarchive!: (v: StaffProjectManageSummary) => void;
    patchMock.mockImplementationOnce(
      () =>
        new Promise<StaffProjectManageSummary>((r) => {
          resolveUnarchive = r;
        }),
    );
    const unarchiveInitial = buildInitial({ archivedAt: "2026-04-01T00:00:00.000Z" });
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, unarchiveInitial));
    const unarchiveSection = screen.getByRole("heading", { name: "Unarchive project" }).closest("div")!;
    await user.click(within(unarchiveSection).getByRole("checkbox"));
    await user.click(within(unarchiveSection).getByRole("button", { name: /unarchive project/i }));
    expect(within(unarchiveSection).getByRole("button", { name: /updating/i })).toBeInTheDocument();
    resolveUnarchive!(buildInitial());
    await waitFor(() =>
      expect(within(unarchiveSection).queryByRole("button", { name: /updating/i })).not.toBeInTheDocument(),
    );
  });

  it("shows pending label while delete request runs", async () => {
    const user = userEvent.setup();
    let resolveDelete!: (v: { moduleId: number }) => void;
    deleteMock.mockImplementationOnce(
      () =>
        new Promise<{ moduleId: number }>((r) => {
          resolveDelete = r;
        }),
    );
    render(withProvider(<StaffProjectManageArchiveOrDeleteSection />, buildInitial()));
    const deleteHeading = screen.getByRole("heading", { name: "Delete project" });
    const deleteSection = deleteHeading.closest("div")!;
    await user.click(within(deleteSection).getByRole("checkbox"));
    await user.click(within(deleteSection).getByRole("button", { name: /delete project/i }));
    expect(within(deleteSection).getByRole("button", { name: /deleting/i })).toBeInTheDocument();
    resolveDelete!({ moduleId: 99 });
    await waitFor(() =>
      expect(within(deleteSection).queryByRole("button", { name: /deleting/i })).not.toBeInTheDocument(),
    );
  });
});
