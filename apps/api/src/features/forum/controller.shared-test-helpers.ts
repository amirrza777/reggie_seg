import type { Response } from "express";
import { vi } from "vitest";

vi.mock("./service.js", () => ({
  fetchDiscussionPosts: vi.fn(),
  fetchDiscussionPost: vi.fn(),
  createDiscussionPost: vi.fn(),
  updateDiscussionPost: vi.fn(),
  deleteDiscussionPost: vi.fn(),
  reportForumPost: vi.fn(),
  reactToDiscussionPost: vi.fn(),
  createStudentForumReport: vi.fn(),
  fetchStudentForumReports: vi.fn(),
  approveStudentForumReport: vi.fn(),
  ignoreStudentForumReport: vi.fn(),
  fetchStaffConversation: vi.fn(),
  fetchForumMembers: vi.fn(),
  fetchForumSettings: vi.fn(),
  setForumSettings: vi.fn(),
}));

export function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

export * as service from "./service.js";
export {
  approveStudentForumReportHandler,
  createProjectDiscussionPostHandler,
  createStudentForumReportHandler,
  deleteProjectDiscussionPostHandler,
  getForumMembersHandler,
  getForumSettingsHandler,
  getProjectDiscussionPostHandler,
  getProjectDiscussionPostsHandler,
  getStaffConversationHandler,
  getStudentForumReportsHandler,
  ignoreStudentForumReportHandler,
  reactToDiscussionPostHandler,
  reportDiscussionPostHandler,
  updateForumSettingsHandler,
  updateProjectDiscussionPostHandler,
} from "./controller.js";
