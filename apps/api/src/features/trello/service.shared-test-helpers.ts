import { beforeEach, vi } from "vitest";
import { canStaffAccessTeamInProject } from "../team-health-review/repo.js";

vi.mock("../team-health-review/repo.js", () => ({
  canStaffAccessTeamInProject: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  TrelloRepo: {
    updateUserTrelloToken: vi.fn(),
    assignBoard: vi.fn(),
    getUserById: vi.fn(),
    getTeamWithOwner: vi.fn(),
    isUserInTeam: vi.fn(),
    setTeamTrelloSectionConfig: vi.fn(),
  },
}));

export const canStaffAccessTeamInProjectMock = vi.mocked(canStaffAccessTeamInProject);

export function setupTrelloServiceCaseDefaults() {
  vi.clearAllMocks();
  process.env.TRELLO_KEY = "test-key";
  process.env.APP_BASE_URL = "http://localhost:3001";
  canStaffAccessTeamInProjectMock.mockResolvedValue(false);
}

export { beforeEach, vi };
export { TrelloService } from "./service.js";
export { TrelloRepo } from "./repo.js";
