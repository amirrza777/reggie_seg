import { beforeEach, describe, expect, it, vi } from "vitest";

const { moduleLeadFindMany } = vi.hoisted(() => ({
  moduleLeadFindMany: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    moduleLead: {
      findMany: moduleLeadFindMany,
    },
  })),
}));

import { ModuleLeadService } from "./moduleLeadService.js";

describe("ModuleLeadService", () => {
  const service = new ModuleLeadService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns module lead users for a module", async () => {
    moduleLeadFindMany.mockResolvedValue([
      { user: { id: 1, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" } },
      { user: { id: 2, firstName: "Alan", lastName: "Turing", email: "alan@example.com" } },
    ]);

    const result = await service.getModuleLeadsByModule(12);

    expect(moduleLeadFindMany).toHaveBeenCalledWith({
      where: { moduleId: 12 },
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
      { id: 1, firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      { id: 2, firstName: "Alan", lastName: "Turing", email: "alan@example.com" },
    ]);
  });

  it("returns empty array when no module leads exist", async () => {
    moduleLeadFindMany.mockResolvedValue([]);

    await expect(service.getModuleLeadsByModule(99)).resolves.toEqual([]);
  });
});
