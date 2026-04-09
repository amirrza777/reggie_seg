import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  prisma: {
    module: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  core: {
    canManageModuleAccess: vi.fn(),
  },
}));

vi.mock("../../shared/db.js", () => ({ prisma: mockState.prisma }));
vi.mock("./service.core.js", () => ({
  canManageModuleAccess: mockState.core.canManageModuleAccess,
}));

import { getModuleMeetingSettings, updateModuleMeetingSettings } from "./service.meeting-settings.js";

const enterpriseUser = { id: 1, enterpriseId: "kcl", role: "ENTERPRISE_ADMIN" as const };

const settingsData = {
  absenceThreshold: 3,
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: true,
  allowAnyoneToWriteMinutes: false,
};

describe("getModuleMeetingSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the settings when the module exists", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue(settingsData);
    const result = await getModuleMeetingSettings(enterpriseUser, 10);
    expect(result).toEqual({ ok: true, value: settingsData });
  });

  it("returns 404 when the module does not exist", async () => {
    mockState.prisma.module.findFirst.mockResolvedValue(null);
    const result = await getModuleMeetingSettings(enterpriseUser, 10);
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
  });
});

describe("updateModuleMeetingSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when the user cannot manage the module", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValue(false);
    const result = await updateModuleMeetingSettings(enterpriseUser, 10, settingsData);
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
    expect(mockState.prisma.module.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the module does not exist", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValue(true);
    mockState.prisma.module.findFirst.mockResolvedValue(null);
    const result = await updateModuleMeetingSettings(enterpriseUser, 10, settingsData);
    expect(result).toEqual({ ok: false, status: 404, error: "Module not found" });
    expect(mockState.prisma.module.update).not.toHaveBeenCalled();
  });

  it("updates and returns the settings", async () => {
    mockState.core.canManageModuleAccess.mockResolvedValue(true);
    mockState.prisma.module.findFirst.mockResolvedValue({ id: 10 });
    mockState.prisma.module.update.mockResolvedValue(settingsData);
    const result = await updateModuleMeetingSettings(enterpriseUser, 10, settingsData);
    expect(result).toEqual({ ok: true, value: settingsData });
    expect(mockState.prisma.module.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: settingsData,
      select: expect.objectContaining({ absenceThreshold: true }),
    });
  });
});
