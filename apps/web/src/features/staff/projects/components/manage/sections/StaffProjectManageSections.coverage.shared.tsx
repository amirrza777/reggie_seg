import type { ReactNode } from "react";
import { beforeEach, vi } from "vitest";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { StaffProjectManageSetupProvider } from "../StaffProjectManageSetupContext";

const hoistedMocks = vi.hoisted(() => ({
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
  getMyQuestionnairesMock: vi.fn(),
}));

export const { patchMock, deleteMock, getMyQuestionnairesMock } = hoistedMocks;

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

export function buildDeadlineSnapshot(
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

export function buildInitial(overrides: Partial<StaffProjectManageSummary> = {}): StaffProjectManageSummary {
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
    canMutateProjectSettings: true,
    ...overrides,
  };
}

export function withProvider(ui: React.ReactElement, initial: StaffProjectManageSummary = buildInitial()) {
  return <StaffProjectManageSetupProvider projectId={1} initial={initial}>{ui}</StaffProjectManageSetupProvider>;
}

export const peerA: Questionnaire = {
  id: 10,
  templateName: "Peer A",
  purpose: "PEER_ASSESSMENT",
} as Questionnaire;

export const peerB: Questionnaire = {
  id: 20,
  templateName: "Peer B",
  purpose: "PEER_ASSESSMENT",
} as Questionnaire;

export function largeModuleDirectory(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: 200 + i,
    email: `student${i}@x.com`,
    firstName: "Stu",
    lastName: `${i}`,
  }));
}

beforeEach(() => {
  patchMock.mockReset();
  deleteMock.mockReset();
  getMyQuestionnairesMock.mockReset();
});

export { StaffProjectManageArchiveOrDeleteSection } from "./StaffProjectManageArchiveOrDeleteSection";
export { StaffProjectManageInfoBoardSection } from "./StaffProjectManageInfoBoardSection";
export { StaffProjectManagePeerTemplateSection } from "./StaffProjectManagePeerTemplateSection";
export { StaffProjectManageProjectAccessSection } from "./StaffProjectManageProjectAccessSection";
export { StaffProjectManageProjectDeadlinesSection } from "./StaffProjectManageProjectDeadlinesSection";
