import { vi } from "vitest";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    teamHealthMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    teamDeadlineOverride: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

export { prisma } from "../../shared/db.js";
export {
  canStaffAccessTeamInProject,
  createTeamHealthMessage,
  getTeamCurrentDeadlineInProject,
  getTeamDeadlineDetailsInProject,
  getTeamHealthMessagesForTeamInProject,
  getTeamHealthMessagesForUserInProject,
  hasAnotherResolvedTeamHealthMessage,
  resolveTeamHealthMessageWithDeadlineOverride,
  reviewTeamHealthMessage,
} from "./repo.js";
