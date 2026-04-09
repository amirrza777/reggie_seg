import { prisma } from "../../shared/db.js";
import { canManageModuleAccess } from "./service.core.js";
import type { EnterpriseUser } from "./types.js";

type ModuleMeetingSettings = {
  absenceThreshold: number;
  minutesEditWindowDays: number;
  attendanceEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

const meetingSettingsSelect = {
  absenceThreshold: true,
  minutesEditWindowDays: true,
  attendanceEditWindowDays: true,
  allowAnyoneToEditMeetings: true,
  allowAnyoneToRecordAttendance: true,
  allowAnyoneToWriteMinutes: true,
};

export async function getModuleMeetingSettings(
  enterpriseUser: EnterpriseUser,
  moduleId: number
): Promise<{ ok: true; value: ModuleMeetingSettings } | { ok: false; status: number; error: string }> {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: meetingSettingsSelect,
  });

  if (!module) {
    return { ok: false, status: 404, error: "Module not found" };
  }

  return { ok: true, value: module };
}

export async function updateModuleMeetingSettings(
  enterpriseUser: EnterpriseUser,
  moduleId: number,
  data: {
    absenceThreshold: number;
    minutesEditWindowDays: number;
    attendanceEditWindowDays: number;
    allowAnyoneToEditMeetings: boolean;
    allowAnyoneToRecordAttendance: boolean;
    allowAnyoneToWriteMinutes: boolean;
  }
): Promise<{ ok: true; value: ModuleMeetingSettings } | { ok: false; status: number; error: string }> {
  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: { id: true },
  });
  if (!module) {
    return { ok: false, status: 404, error: "Module not found" };
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data,
    select: meetingSettingsSelect,
  });

  return { ok: true, value: updated };
}
