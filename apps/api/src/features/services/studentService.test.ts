import { beforeEach, describe, expect, it, vi } from "vitest";

const { userModuleFindMany, teamAllocationFindMany } = vi.hoisted(() => ({
  userModuleFindMany: vi.fn(),
  teamAllocationFindMany: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    userModule: {
      findMany: userModuleFindMany,
    },
    teamAllocation: {
      findMany: teamAllocationFindMany,
    },
  })),
}));

import { UserService } from "./studentService.js";

describe("UserService", () => {
  const service = new UserService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStudentsByModule returns student users in module", async () => {
    userModuleFindMany.mockResolvedValue([
      { user: { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com" } },
    ]);

    const result = await service.getStudentsByModule(5);

    expect(userModuleFindMany).toHaveBeenCalledWith({
      where: {
        moduleId: 5,
        user: { role: "STUDENT" },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toEqual([
      { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    ]);
  });

  it("getStudentsByTeam returns student users in team", async () => {
    teamAllocationFindMany.mockResolvedValue([
      { user: { id: 2, firstName: "John", lastName: "Smith", email: "john@example.com" } },
    ]);

    const result = await service.getStudentsByTeam(10);

    expect(teamAllocationFindMany).toHaveBeenCalledWith({
      where: {
        teamId: 10,
        user: { role: "STUDENT" },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    expect(result).toEqual([
      { id: 2, firstName: "John", lastName: "Smith", email: "john@example.com" },
    ]);
  });
});
