import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRouteHandler, mockRes, prisma, setupEnterpriseAdminRouterTestDefaults } from "./router.test-helpers.js";
beforeEach(() => {
  setupEnterpriseAdminRouterTestDefaults();
});
describe("enterpriseAdmin router extra coverage", () => {
  const getOverview = getRouteHandler("get", "/overview");
  const getFeatureFlags = getRouteHandler("get", "/feature-flags");
  const patchFeatureFlag = getRouteHandler("patch", "/feature-flags/:key");
  const listModules = getRouteHandler("get", "/modules");
  const searchModules = getRouteHandler("get", "/modules/search");
  const listAccessUsers = getRouteHandler("get", "/modules/access-users");
  const searchAccessUsers = getRouteHandler("get", "/modules/access-users/search");
  const createModule = getRouteHandler("post", "/modules");
  const getModuleAccess = getRouteHandler("get", "/modules/:moduleId/access");
  const getAccessSelection = getRouteHandler("get", "/modules/:moduleId/access-selection");
  const getJoinCode = getRouteHandler("get", "/modules/:moduleId/join-code");
  const updateModule = getRouteHandler("put", "/modules/:moduleId");
  const deleteModule = getRouteHandler("delete", "/modules/:moduleId");
  const updateStudents = getRouteHandler("put", "/modules/:moduleId/students");
  const getStudents = getRouteHandler("get", "/modules/:moduleId/students");
  const getMeetingSettings = getRouteHandler("get", "/modules/:moduleId/meeting-settings");
  const putMeetingSettings = getRouteHandler("put", "/modules/:moduleId/meeting-settings");
  it("handles overview route auth and role guards", async () => {
    const missingRes = mockRes();
    await getOverview({} as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(500);
    const staffRes = mockRes();
    await getOverview({ enterpriseUser: { id: 44, enterpriseId: "ent-1", role: "STAFF" } } as any, staffRes);
    expect(staffRes.status).toHaveBeenCalledWith(403);
    const adminRes = mockRes();
    await getOverview({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, adminRes);
    expect(adminRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totals: expect.objectContaining({ users: 5, modules: 2 }),
      }),
    );
  });
  it("returns 500 when feature-flag patch throws unexpected errors", async () => {
    (prisma.featureFlag.update as any).mockRejectedValueOnce(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockRes();
    await patchFeatureFlag(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { key: "repos" },
        body: { enabled: true },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(errorSpy).toHaveBeenCalled();
  });
  it("handles modules access-users route with missing and valid enterprise context", async () => {
    const missingRes = mockRes();
    await listAccessUsers({} as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(500);
    (prisma.user.findMany as any).mockResolvedValueOnce([{ id: 11 }]).mockResolvedValueOnce([{ id: 31 }]);
    const okRes = mockRes();
    await listAccessUsers({ enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ staff: [{ id: 11 }], students: [{ id: 31 }] });
  });
  it("enforces module creation role and leader requirements", async () => {
    const staffRes = mockRes();
    await createModule(
      {
        enterpriseUser: { id: 44, enterpriseId: "ent-1", role: "STAFF" },
        body: { name: "X", leaderIds: [44], taIds: [], studentIds: [] },
      } as any,
      staffRes,
    );
    expect(staffRes.status).toHaveBeenCalledWith(403);
    const noLeaderRes = mockRes();
    await createModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { name: "X", leaderIds: [], taIds: [], studentIds: [] },
      } as any,
      noLeaderRes,
    );
    expect(noLeaderRes.status).toHaveBeenCalledWith(400);
  });
  it("validates and updates module students route", async () => {
    const invalidModuleRes = mockRes();
    await updateStudents(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "x" }, body: {} } as any,
      invalidModuleRes,
    );
    expect(invalidModuleRes.status).toHaveBeenCalledWith(400);
    const invalidIdsRes = mockRes();
    await updateStudents(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: { studentIds: "not-an-array" },
      } as any,
      invalidIdsRes,
    );
    expect(invalidIdsRes.status).toHaveBeenCalledWith(400);
    (prisma.moduleLead.findFirst as any).mockResolvedValueOnce(null);
    const forbiddenRes = mockRes();
    await updateStudents(
      {
        enterpriseUser: { id: 44, enterpriseId: "ent-1", role: "STAFF" },
        params: { moduleId: "7" },
        body: { studentIds: [] },
      } as any,
      forbiddenRes,
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 7 });
    (prisma.moduleLead.findMany as any).mockResolvedValueOnce([]);
    (prisma.moduleTeachingAssistant.findMany as any).mockResolvedValueOnce([]);
    const okRes = mockRes();
    await updateStudents(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: { studentIds: [] },
      } as any,
      okRes,
    );
    expect(okRes.json).toHaveBeenCalledWith({ moduleId: 7, studentIds: [], studentCount: 0 });
  });
  it("returns module students for a valid module", async () => {
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce({
      id: 7,
      code: "MOD-7",
      name: "Module 7",
      briefText: null,
      timelineText: null,
      expectationsText: null,
      readinessNotesText: null,
      createdAt: new Date("2026-03-01"),
      updatedAt: new Date("2026-03-01"),
      _count: { userModules: 1, moduleLeads: 1, moduleTeachingAssistants: 0 },
    });
    (prisma.user.findMany as any).mockResolvedValueOnce([
      {
        id: 31,
        email: "student@example.com",
        firstName: "Stu",
        lastName: "Dent",
        active: true,
        userModules: [{ moduleId: 7 }],
      },
    ]);
    const res = mockRes();
    await getStudents(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
      } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        module: expect.objectContaining({ id: 7 }),
        students: [
          expect.objectContaining({
            id: 31,
            enrolled: true,
          }),
        ],
      }),
    );
  });
  it("validates meeting-settings routes", async () => {
    const invalidGetRes = mockRes();
    await getMeetingSettings(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "bad" } } as any,
      invalidGetRes,
    );
    expect(invalidGetRes.status).toHaveBeenCalledWith(400);
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const notFoundGetRes = mockRes();
    await getMeetingSettings(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      notFoundGetRes,
    );
    expect(notFoundGetRes.status).toHaveBeenCalledWith(404);
    (prisma.module.findFirst as any).mockResolvedValueOnce({
      absenceThreshold: 3,
      minutesEditWindowDays: 7,
      attendanceEditWindowDays: 5,
      allowAnyoneToEditMeetings: false,
      allowAnyoneToRecordAttendance: false,
      allowAnyoneToWriteMinutes: false,
    });
    const okGetRes = mockRes();
    await getMeetingSettings(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      okGetRes,
    );
    expect(okGetRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ absenceThreshold: 3, minutesEditWindowDays: 7, attendanceEditWindowDays: 5 }),
    );
    const invalidAbsenceRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 0,
          minutesEditWindowDays: 7,
          attendanceEditWindowDays: 7,
          allowAnyoneToEditMeetings: false,
          allowAnyoneToRecordAttendance: false,
          allowAnyoneToWriteMinutes: false,
        },
      } as any,
      invalidAbsenceRes,
    );
    expect(invalidAbsenceRes.status).toHaveBeenCalledWith(400);
    const invalidWindowRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 2,
          minutesEditWindowDays: 0,
          attendanceEditWindowDays: 7,
          allowAnyoneToEditMeetings: false,
          allowAnyoneToRecordAttendance: false,
          allowAnyoneToWriteMinutes: false,
        },
      } as any,
      invalidWindowRes,
    );
    expect(invalidWindowRes.status).toHaveBeenCalledWith(400);
    const missingBooleanRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 2,
          minutesEditWindowDays: 14,
          attendanceEditWindowDays: 21,
        },
      } as any,
      missingBooleanRes,
    );
    expect(missingBooleanRes.status).toHaveBeenCalledWith(400);
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const notFoundPutRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 2,
          minutesEditWindowDays: 14,
          attendanceEditWindowDays: 21,
          allowAnyoneToEditMeetings: false,
          allowAnyoneToRecordAttendance: false,
          allowAnyoneToWriteMinutes: false,
        },
      } as any,
      notFoundPutRes,
    );
    expect(notFoundPutRes.status).toHaveBeenCalledWith(404);
    const invalidBooleanRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 2,
          minutesEditWindowDays: 14,
          attendanceEditWindowDays: 21,
          allowAnyoneToEditMeetings: "true",
          allowAnyoneToRecordAttendance: false,
          allowAnyoneToWriteMinutes: false,
        },
      } as any,
      invalidBooleanRes,
    );
    expect(invalidBooleanRes.status).toHaveBeenCalledWith(400);
  });
  it("updates meeting-settings and returns the updated values", async () => {
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.update as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 7 });
    (prisma.module.update as any).mockResolvedValueOnce({
      absenceThreshold: 2,
      minutesEditWindowDays: 14,
      attendanceEditWindowDays: 21,
      allowAnyoneToEditMeetings: true,
      allowAnyoneToRecordAttendance: true,
      allowAnyoneToWriteMinutes: false,
    });
    const res = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {
          absenceThreshold: 2,
          minutesEditWindowDays: 14,
          attendanceEditWindowDays: 21,
          allowAnyoneToEditMeetings: true,
          allowAnyoneToRecordAttendance: true,
          allowAnyoneToWriteMinutes: false,
        },
      } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      absenceThreshold: 2,
      minutesEditWindowDays: 14,
      attendanceEditWindowDays: 21,
      allowAnyoneToEditMeetings: true,
      allowAnyoneToRecordAttendance: true,
      allowAnyoneToWriteMinutes: false,
    });
    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        absenceThreshold: 2,
        minutesEditWindowDays: 14,
        attendanceEditWindowDays: 21,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: true,
        allowAnyoneToWriteMinutes: false,
      },
      select: {
        absenceThreshold: true,
        minutesEditWindowDays: true,
        attendanceEditWindowDays: true,
        allowAnyoneToEditMeetings: true,
        allowAnyoneToRecordAttendance: true,
        allowAnyoneToWriteMinutes: true,
      },
    });
  });
  it("returns 500 when enterprise context is missing on protected routes", async () => {
    const protectedHandlers = [
      getFeatureFlags,
      patchFeatureFlag,
      listModules,
      searchModules,
      listAccessUsers,
      searchAccessUsers,
      createModule,
      getModuleAccess,
      getAccessSelection,
      getJoinCode,
      updateModule,
      deleteModule,
      getStudents,
      updateStudents,
      getMeetingSettings,
      putMeetingSettings,
    ];
    for (const handler of protectedHandlers) {
      const res = mockRes();
      await handler(
        {
          params: { key: "repos", moduleId: "7" },
          query: {},
          body: {
            enabled: true,
            name: "Module X",
            code: "MODX",
            leaderIds: [99],
            taIds: [],
            studentIds: [],
            absenceThreshold: 2,
            minutesEditWindowDays: 7,
            attendanceEditWindowDays: 7,
          },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
    }
  });
  it("returns 400 for invalid module ids across module-scoped routes", async () => {
    const invalidIdHandlers = [
      getModuleAccess,
      getAccessSelection,
      getJoinCode,
      updateModule,
      deleteModule,
      getStudents,
      putMeetingSettings,
    ];
    for (const handler of invalidIdHandlers) {
      const res = mockRes();
      await handler(
        {
          enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
          params: { moduleId: "bad-id" },
          body: {
            name: "Module X",
            code: "MODX",
            leaderIds: [99],
            taIds: [],
            studentIds: [],
            absenceThreshold: 2,
            minutesEditWindowDays: 7,
            attendanceEditWindowDays: 7,
          },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });
  it("covers non-ok service responses for route handlers", async () => {
    const featureFlagsRes = mockRes();
    await getFeatureFlags(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "STAFF" } } as any,
      featureFlagsRes,
    );
    expect(featureFlagsRes.status).toHaveBeenCalledWith(403);
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 999 });
    const createErrorRes = mockRes();
    await createModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: { name: "Existing Module", code: "EXISTING", leaderIds: [99], taIds: [], studentIds: [] },
      } as any,
      createErrorRes,
    );
    expect(createErrorRes.status).toHaveBeenCalledWith(409);
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const accessErrorRes = mockRes();
    await getModuleAccess(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      accessErrorRes,
    );
    expect(accessErrorRes.status).toHaveBeenCalledWith(404);
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const selectionErrorRes = mockRes();
    await getAccessSelection(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      selectionErrorRes,
    );
    expect(selectionErrorRes.status).toHaveBeenCalledWith(404);
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const deleteErrorRes = mockRes();
    await deleteModule(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      deleteErrorRes,
    );
    expect(deleteErrorRes.status).toHaveBeenCalledWith(404);
    (prisma.module.findFirst as any).mockReset();
    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const studentsErrorRes = mockRes();
    await getStudents(
      { enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" }, params: { moduleId: "7" } } as any,
      studentsErrorRes,
    );
    expect(studentsErrorRes.status).toHaveBeenCalledWith(404);
  });
  it("returns 400 for invalid module payloads", async () => {
    const createPayloadRes = mockRes();
    await createModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        body: {},
      } as any,
      createPayloadRes,
    );
    expect(createPayloadRes.status).toHaveBeenCalledWith(400);
    const updatePayloadRes = mockRes();
    await updateModule(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: {},
      } as any,
      updatePayloadRes,
    );
    expect(updatePayloadRes.status).toHaveBeenCalledWith(400);
  });
});
