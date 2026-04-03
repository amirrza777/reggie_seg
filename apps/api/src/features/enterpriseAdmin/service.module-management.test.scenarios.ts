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
      findFirst: vi.fn(),
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
  isEnterpriseAdminRole: (role: string) => role === "ENTERPRISE_ADMIN" || role === "ADMIN",
}));
vi.mock("./service.core.js", () => ({
  canManageModuleAccess: mockState.core.canManageModuleAccess,
  mapModuleRecord: mockState.core.mapModuleRecord,
  MODULE_SELECT: { id: true, name: true, _count: true },
}));
import {
  createModule,
  deleteModule,
  getModuleAccess,
  getModuleAccessSelection,
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
  mockState.prisma.moduleLead.findFirst.mockResolvedValue(null);
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
  it("returns conflict when creating a duplicate module code", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 2 });
    const result = await createModule(enterpriseUser as any, {
      name: "Module A",
      code: "MOD-100",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });
    expect(mockState.prisma.module.findFirst).toHaveBeenNthCalledWith(2, {
      where: { enterpriseId: "ent-1", code: "MOD-100" },
      select: { id: true },
    });
    expect(result).toEqual({ ok: false, status: 409, error: "Module code already exists" });
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
  it("returns 400 when a module lead removes their own module lead role", async () => {
    mockState.prisma.moduleLead.findFirst.mockResolvedValueOnce({ moduleId: 7 });
    const staffLead = { id: 42, enterpriseId: "ent-1", role: "STAFF" } as const;
    const result = await updateModule(staffLead as any, 7, {
      name: "X",
      code: null,
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "You cannot remove your own module lead role from this module",
    });
  });
  it("returns conflict when updating module with duplicate module code", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 8 });
    const result = await updateModule(enterpriseUser as any, 7, {
      name: "Updated module",
      code: "MOD-200",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });
    expect(mockState.prisma.module.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        enterpriseId: "ent-1",
        code: "MOD-200",
        id: { not: 7 },
      },
      select: { id: true },
    });
    expect(result).toEqual({ ok: false, status: 409, error: "Module code already exists" });
  });
  it("returns validation error when updating module with invalid assignments", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockState.helpers.validateAssignmentUsers.mockResolvedValueOnce({ ok: false, error: "invalid assignments" });
    const result = await updateModule(enterpriseUser as any, 7, {
      name: "Updated module",
      code: "MOD-201",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });
    expect(result).toEqual({ ok: false, status: 400, error: "invalid assignments" });
  });
  it("returns 404 when update target module no longer exists in transaction", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const result = await updateModule(enterpriseUser as any, 7, {
      name: "Updated module",
      code: null,
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      leaderIds: [11],
      taIds: [],
      studentIds: [],
    });
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
  it("returns 404 when module students are requested for a missing module", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    const result = await getModuleStudents(enterpriseUser as any, 777);
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
  it("returns 404 when module access is requested for a missing module", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    const result = await getModuleAccess(enterpriseUser as any, 777);
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
  it("returns 403 when caller cannot manage module access", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValueOnce(false);
    const result = await getModuleAccess(enterpriseUser as any, 7);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });
  it("returns mapped module access payload for staff and students", async () => {
    mockState.prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 11,
          email: "staff@uni.edu",
          firstName: "Staff",
          lastName: "User",
          active: true,
          moduleLeads: [{ moduleId: 7 }],
          moduleTeachingAssistants: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          email: "student@uni.edu",
          firstName: "Student",
          lastName: "User",
          active: true,
          userModules: [{ moduleId: 7 }],
          moduleTeachingAssistants: [],
        },
      ]);
    const result = await getModuleAccess(enterpriseUser as any, 7);
    expect(result).toEqual({
      ok: true,
      value: {
        module: { id: 7, name: "Module 7" },
        staff: [
          expect.objectContaining({
            id: 11,
            isLeader: true,
            isTeachingAssistant: false,
          }),
        ],
        students: [
          expect.objectContaining({
            id: 31,
            enrolled: true,
            isTeachingAssistant: false,
          }),
        ],
      },
    });
  });
  it("returns 404 when module access selection target is missing", async () => {
    mockState.prisma.module.findFirst.mockResolvedValueOnce(null);
    const result = await getModuleAccessSelection(enterpriseUser as any, 777);
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
  it("returns 403 when caller cannot manage module access selection", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValueOnce(false);
    const result = await getModuleAccessSelection(enterpriseUser as any, 7);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });
  it("returns selected leader, ta, and student ids", async () => {
    mockState.prisma.moduleLead.findMany.mockResolvedValueOnce([{ userId: 11 }, { userId: 12 }]);
    mockState.prisma.moduleTeachingAssistant.findMany.mockResolvedValueOnce([{ userId: 21 }]);
    mockState.prisma.userModule.findMany.mockResolvedValueOnce([{ userId: 31 }, { userId: 32 }]);
    const result = await getModuleAccessSelection(enterpriseUser as any, 7);
    expect(result).toEqual({
      ok: true,
      value: {
        module: { id: 7, name: "Module 7" },
        leaderIds: [11, 12],
        taIds: [21],
        studentIds: [31, 32],
      },
    });
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
  it("updates module students and skips insert when the requested list is empty", async () => {
    const result = await updateModuleStudents(enterpriseUser as any, 7, []);
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
  it("returns 403 when deleting module without manage access", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValueOnce(false);
    const result = await deleteModule(enterpriseUser as any, 7);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });
  it("deletes module and related assignments when module exists", async () => {
    mockState.prisma.moduleLead.deleteMany.mockResolvedValueOnce({ count: 1 });
    mockState.prisma.moduleTeachingAssistant.deleteMany.mockResolvedValueOnce({ count: 1 });
    mockState.prisma.userModule.deleteMany.mockResolvedValueOnce({ count: 2 });
    mockState.prisma.module.delete.mockResolvedValueOnce({ id: 7 });
    const result = await deleteModule(enterpriseUser as any, 7);
    expect(mockState.prisma.moduleLead.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 7 } });
    expect(mockState.prisma.moduleTeachingAssistant.deleteMany).toHaveBeenCalledWith({ where: { moduleId: 7 } });
    expect(mockState.prisma.userModule.deleteMany).toHaveBeenCalledWith({
      where: { enterpriseId: "ent-1", moduleId: 7 },
    });
    expect(mockState.prisma.module.delete).toHaveBeenCalledWith({ where: { id: 7 }, select: { id: true } });
    expect(result).toEqual({ ok: true, value: { moduleId: 7, deleted: true } });
  });
});
