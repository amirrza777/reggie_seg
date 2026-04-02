import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRouteHandler, mockRes, prisma, setupEnterpriseAdminRouterTestDefaults } from "./router.test-helpers.js";

beforeEach(() => {
  setupEnterpriseAdminRouterTestDefaults();
});

describe("enterpriseAdmin router extra coverage", () => {
  const getOverview = getRouteHandler("get", "/overview");
  const patchFeatureFlag = getRouteHandler("patch", "/feature-flags/:key");
  const listAccessUsers = getRouteHandler("get", "/modules/access-users");
  const createModule = getRouteHandler("post", "/modules");
  const updateStudents = getRouteHandler("put", "/modules/:moduleId/students");
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
        body: { absenceThreshold: 0, minutesEditWindowDays: 7, attendanceEditWindowDays: 7 },
      } as any,
      invalidAbsenceRes,
    );
    expect(invalidAbsenceRes.status).toHaveBeenCalledWith(400);

    const invalidWindowRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: { absenceThreshold: 2, minutesEditWindowDays: 0, attendanceEditWindowDays: 7 },
      } as any,
      invalidWindowRes,
    );
    expect(invalidWindowRes.status).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce(null);
    const notFoundPutRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: { absenceThreshold: 2, minutesEditWindowDays: 14, attendanceEditWindowDays: 0 },
      } as any,
      notFoundPutRes,
    );
    expect(notFoundPutRes.status).toHaveBeenCalledWith(400);

    (prisma.module.findFirst as any).mockResolvedValueOnce({ id: 7 });
    (prisma.module.update as any).mockResolvedValueOnce({
      absenceThreshold: 2,
      minutesEditWindowDays: 14,
      attendanceEditWindowDays: 21,
      allowAnyoneToEditMeetings: false,
      allowAnyoneToRecordAttendance: false,
      allowAnyoneToWriteMinutes: false,
    });
    const okPutRes = mockRes();
    await putMeetingSettings(
      {
        enterpriseUser: { id: 99, enterpriseId: "ent-1", role: "ENTERPRISE_ADMIN" },
        params: { moduleId: "7" },
        body: { absenceThreshold: 2, minutesEditWindowDays: 14, attendanceEditWindowDays: 21 },
      } as any,
      okPutRes,
    );
    expect(okPutRes.status).toHaveBeenCalledWith(404);
    expect(okPutRes.json).toHaveBeenCalledWith({ error: "Module not found" });
  });
});
