import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveTeamMarkingIfLead,
  saveStudentMarkingIfLead,
} from "./service.js";

vi.mock("./repo.js", () => ({
  findModulesForStaff: vi.fn(),
  countSubmittedPAsForModule: vi.fn(),
  countStudentsInModule: vi.fn(),
  getModuleDetailsIfAuthorised: vi.fn(),
  findTeamsInModule: vi.fn(),
  countSubmittedPAsForTeam: vi.fn(),
  countStudentsInTeam: vi.fn(),
  findTeamByIdAndModule: vi.fn(),
  getTeamWithAssessments: vi.fn(),
  findAssessmentsForRevieweeInTeam: vi.fn(),
  findTemplateWithQuestions: vi.fn(),
  findTeamMarking: vi.fn(),
  findStudentMarking: vi.fn(),
  upsertTeamMarking: vi.fn(),
  upsertStudentMarking: vi.fn(),
  isStudentInTeam: vi.fn(),
}));

import * as repo from "./repo.js";

const mockRepo = vi.mocked(repo);

beforeEach(() => {
  vi.clearAllMocks();
});

const moduleLead = { id: 1, name: "Module A", archivedAt: null as Date | null };
const teamInModule = { id: 10, teamName: "Team 1" };

describe("marking support", () => {
  it("saves team marking when staff leads the module and team exists", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.upsertTeamMarking.mockResolvedValue({
      mark: 72,
      formativeFeedback: "Good collaboration and communication.",
      updatedAt: new Date("2026-03-06T10:00:00.000Z"),
      marker: { id: 1, firstName: "Tutor", lastName: "One" },
    } as Awaited<ReturnType<typeof repo.upsertTeamMarking>>);

    const result = await saveTeamMarkingIfLead(1, 1, 10, {
      mark: 72,
      formativeFeedback: "Good collaboration and communication.",
    });

    expect(result).toEqual({
      mark: 72,
      formativeFeedback: "Good collaboration and communication.",
      updatedAt: "2026-03-06T10:00:00.000Z",
      marker: { id: 1, firstName: "Tutor", lastName: "One" },
    });
  });

  it("returns null for team marking when staff is not module lead", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(null);

    const result = await saveTeamMarkingIfLead(99, 1, 10, {
      mark: 60,
      formativeFeedback: "Needs stronger planning.",
    });

    expect(result).toBeNull();
    expect(mockRepo.upsertTeamMarking).not.toHaveBeenCalled();
  });

  it("rejects team marking when module is archived", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue({
      ...moduleLead,
      archivedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);

    await expect(
      saveTeamMarkingIfLead(1, 1, 10, { mark: 50, formativeFeedback: "x" }),
    ).rejects.toEqual({ code: "MODULE_ARCHIVED" });
    expect(mockRepo.upsertTeamMarking).not.toHaveBeenCalled();
  });

  it("saves student marking when student is in team and staff leads module", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue(moduleLead);
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.isStudentInTeam.mockResolvedValue(true);
    mockRepo.upsertStudentMarking.mockResolvedValue({
      mark: 78,
      formativeFeedback: "Strong technical contribution.",
      updatedAt: new Date("2026-03-06T11:00:00.000Z"),
      marker: { id: 1, firstName: "Tutor", lastName: "One" },
    } as Awaited<ReturnType<typeof repo.upsertStudentMarking>>);

    const result = await saveStudentMarkingIfLead(1, 1, 10, 100, {
      mark: 78,
      formativeFeedback: "Strong technical contribution.",
    });

    expect(result).toEqual({
      mark: 78,
      formativeFeedback: "Strong technical contribution.",
      updatedAt: "2026-03-06T11:00:00.000Z",
      marker: { id: 1, firstName: "Tutor", lastName: "One" },
    });
  });

  it("rejects student marking when module is archived", async () => {
    mockRepo.getModuleDetailsIfAuthorised.mockResolvedValue({
      ...moduleLead,
      archivedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mockRepo.findTeamByIdAndModule.mockResolvedValue(teamInModule);
    mockRepo.isStudentInTeam.mockResolvedValue(true);

    await expect(
      saveStudentMarkingIfLead(1, 1, 10, 100, { mark: 50, formativeFeedback: "x" }),
    ).rejects.toEqual({ code: "MODULE_ARCHIVED" });
    expect(mockRepo.upsertStudentMarking).not.toHaveBeenCalled();
  });
});
