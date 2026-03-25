import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    module: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    moduleLead: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    moduleTeachingAssistant: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    userModule: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  helpers: {
    ensureCreatorLeader: vi.fn(),
    replaceModuleAssignments: vi.fn(),
    sanitiseModuleStudentIdsForUpdate: vi.fn(),
    validateAssignmentUsers: vi.fn(),
  },
  core: {
    canManageModuleAccess: vi.fn(),
    mapModuleRecord: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mockState.prisma }));
vi.mock("./service.helpers.js", () => ({
  ensureCreatorLeader: mockState.helpers.ensureCreatorLeader,
  replaceModuleAssignments: mockState.helpers.replaceModuleAssignments,
  sanitiseModuleStudentIdsForUpdate: mockState.helpers.sanitiseModuleStudentIdsForUpdate,
  validateAssignmentUsers: mockState.helpers.validateAssignmentUsers,
}));
vi.mock("./service.core.js", () => ({
  canManageModuleAccess: mockState.core.canManageModuleAccess,
  mapModuleRecord: mockState.core.mapModuleRecord,
  MODULE_SELECT: { id: true, name: true, _count: true },
}));

import {
  createModule,
  deleteModule,
  getModuleStudents,
  updateModule,
  updateModuleStudents,
} from "./service.module-management.js";

const enterpriseUser = { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } as const;

beforeEach(() => {
  vi.clearAllMocks();

  mockState.prisma.$transaction.mockImplementation(async (fn: any) => fn(mockState.prisma));

  mockState.helpers.ensureCreatorLeader.mockImplementation((leaderIds: number[]) => leaderIds);
  mockState.helpers.sanitiseModuleStudentIdsForUpdate.mockImplementation(async (_enterpriseId: string, studentIds: number[]) => studentIds);
  mockState.helpers.validateAssignmentUsers.mockResolvedValue({ ok: true });

  mockState.core.canManageModuleAccess.mockResolvedValue(true);
  mockState.core.mapModuleRecord.mockImplementation((module: any) => ({ id: module.id, name: module.name ?? "Module" }));

  mockState.prisma.module.findFirst.mockResolvedValue({ id: 7, name: "Module 7", _count: {} });
  mockState.prisma.module.findUnique.mockResolvedValue({ id: 7, name: "Module 7", _count: {} });
  mockState.prisma.module.create.mockResolvedValue({ id: 7 });
  mockState.prisma.module.update.mockResolvedValue({ id: 7 });

  mockState.prisma.user.findMany.mockResolvedValue([]);
  mockState.prisma.moduleLead.findMany.mockResolvedValue([]);
  mockState.prisma.moduleTeachingAssistant.findMany.mockResolvedValue([]);
  mockState.prisma.userModule.deleteMany.mockResolvedValue({ count: 0 });
  mockState.prisma.userModule.createMany.mockResolvedValue({ count: 0 });
});

describe("enterpriseAdmin service.module-management", () => {
  it("returns conflict when creating a duplicate module name", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce({ id: 1 });

    const result = await createModule(enterpriseUser as any, {
      name: "Duplicate",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });

    expect(result).toEqual({ ok: false, status: 409, error: "Module name already exists" });
  });

  it("returns validation error when creating module with invalid assignments", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    mockState.helpers.validateAssignmentUsers.mockResolvedValueOnce({ ok: false, error: "bad users" });

    const result = await createModule(enterpriseUser as any, {
      name: "Module A",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });

    expect(result).toEqual({ ok: false, status: 400, error: "bad users" });
  });

  it("returns 400 when updating module with no leaders", async () => {
    const result = await updateModule(enterpriseUser as any, 7, {
      name: "X",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [],
      taIds: [],
      studentIds: [],
    });

    expect(result).toEqual({ ok: false, status: 400, error: "At least one module leader is required" });
  });

  it("returns 404 when module students are requested for a missing module", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);

    const result = await getModuleStudents(enterpriseUser as any, 777);

    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });

  it("returns 403 when caller cannot manage module students", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValueOnce(false);

    const result = await getModuleStudents(enterpriseUser as any, 7);

    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("returns mapped module students with enrolled status", async () => {
    mockState.prisma.user.findMany.mockResolvedValueOnce([
      {
        id: 31,
        email: "a@student.com",
        firstName: "A",
        lastName: "Student",
        active: true,
        userModules: [{ moduleId: 7 }],
      },
      {
        id: 32,
        email: "b@student.com",
        firstName: "B",
        lastName: "Student",
        active: false,
        userModules: [],
      },
    ]);

    const result = await getModuleStudents(enterpriseUser as any, 7);

    expect(result).toEqual({
      ok: true,
      value: {
        module: { id: 7, name: "Module 7" },
        students: [
          expect.objectContaining({ id: 31, enrolled: true }),
          expect.objectContaining({ id: 32, enrolled: false }),
        ],
      },
    });
  });

  it("returns 403 when updating module students without access", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValueOnce(false);

    const result = await updateModuleStudents(enterpriseUser as any, 7, [31]);

    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("returns 404 when updating students for a missing module", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);

    const result = await updateModuleStudents(enterpriseUser as any, 7, [31]);

    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });

  it("returns 400 when updated students fail validation", async () => {
    mockState.helpers.sanitiseModuleStudentIdsForUpdate.mockResolvedValueOnce([31]);
    mockState.helpers.validateAssignmentUsers.mockResolvedValueOnce({ ok: false, error: "invalid student" });

    const result = await updateModuleStudents(enterpriseUser as any, 7, [31]);

    expect(result).toEqual({ ok: false, status: 400, error: "invalid student" });
  });

  it("updates module students and skips insert when sanitised list is empty", async () => {
    mockState.helpers.sanitiseModuleStudentIdsForUpdate.mockResolvedValueOnce([]);

    const result = await updateModuleStudents(enterpriseUser as any, 7, [31, 32]);

    expect(mockState.prisma.userModule.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-1", moduleId: 7 } });
    expect(mockState.prisma.userModule.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { moduleId: 7, studentIds: [], studentCount: 0 } });
  });

  it("updates module students and inserts sanitised records", async () => {
    mockState.helpers.sanitiseModuleStudentIdsForUpdate.mockResolvedValueOnce([31, 32]);

    const result = await updateModuleStudents(enterpriseUser as any, 7, [31, 32]);

    expect(mockState.prisma.userModule.createMany).toHaveBeenCalledWith({
      data: [
        { enterpriseId: "ent-1", moduleId: 7, userId: 31 },
        { enterpriseId: "ent-1", moduleId: 7, userId: 32 },
      ],
    });
    expect(result).toEqual({ ok: true, value: { moduleId: 7, studentIds: [31, 32], studentCount: 2 } });
  });

  it("returns not-found response when deleting a non-existent module", async () => {
    mockState.prisma.$transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        ...mockState.prisma,
        module: { ...mockState.prisma.module, findFirst: vi.fn().mockResolvedValue(null) },
      };
      return fn(tx);
    });

    const result = await deleteModule(enterpriseUser as any, 99);

    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
});
