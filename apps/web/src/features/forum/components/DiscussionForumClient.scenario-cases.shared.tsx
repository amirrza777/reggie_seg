import { vi } from "vitest";
import { useUser } from "@/features/auth/useUser";
import {
  createDiscussionPost,
  createStudentForumReport,
  deleteDiscussionPost,
  getDiscussionPosts,
  reactToDiscussionPost,
  reportDiscussionPost,
  updateDiscussionPost,
} from "@/features/forum/api/client";

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({ onChange, onEmptyChange, placeholder }: { onChange: (v: string) => void; onEmptyChange?: (e: boolean) => void; placeholder?: string }) => (
    <textarea
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        onEmptyChange?.(e.target.value.trim().length === 0);
      }}
    />
  ),
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <p>{content}</p>,
}));

vi.mock("@/features/auth/useUser", () => ({
  useUser: vi.fn(),
}));

vi.mock("@/features/forum/api/client", () => ({
  createDiscussionPost: vi.fn(),
  createStudentForumReport: vi.fn(),
  deleteDiscussionPost: vi.fn(),
  getDiscussionPosts: vi.fn(),
  reactToDiscussionPost: vi.fn(),
  reportDiscussionPost: vi.fn(),
  updateDiscussionPost: vi.fn(),
}));

export const useUserMock = vi.mocked(useUser);
export const createDiscussionPostMock = vi.mocked(createDiscussionPost);
export const createStudentForumReportMock = vi.mocked(createStudentForumReport);
export const deleteDiscussionPostMock = vi.mocked(deleteDiscussionPost);
export const getDiscussionPostsMock = vi.mocked(getDiscussionPosts);
export const reactToDiscussionPostMock = vi.mocked(reactToDiscussionPost);
export const reportDiscussionPostMock = vi.mocked(reportDiscussionPost);
export const updateDiscussionPostMock = vi.mocked(updateDiscussionPost);

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

export function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    parentPostId: null,
    title: "Root post",
    body: "Root body",
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T10:00:00.000Z",
    reactionScore: 0,
    myReaction: null,
    myStudentReportStatus: null,
    author: { id: 2, firstName: "Takao", lastName: "Watson", role: "STUDENT" as const },
    replies: [],
    ...overrides,
  };
}

export function setupDiscussionForumScenarioCaseDefaults() {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  useUserMock.mockReturnValue({
    user: {
      id: 1,
      firstName: "Ayan",
      lastName: "Mamun",
      role: "STUDENT",
      isStaff: false,
      isAdmin: false,
      isEnterpriseAdmin: false,
    },
    loading: false,
  } as ReturnType<typeof useUser>);
}

export function teardownDiscussionForumScenarioCaseDefaults() {
  consoleErrorSpy?.mockRestore();
  consoleErrorSpy = null;
}
