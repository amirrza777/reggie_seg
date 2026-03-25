import { prisma } from "../../shared/db.js";
import { canManageModuleAccess } from "./service.core.js";
import type { EnterpriseUser } from "./types.js";

type ModuleMeetingSettings = {
  absenceThreshold: number;
  minutesEditWindowDays: number;
  allowAnyoneToEditMeetings: boolean;
  allowAnyoneToRecordAttendance: boolean;
  allowAnyoneToWriteMinutes: boolean;
};

export async function getModuleMeetingSettings(
  enterpriseUser: EnterpriseUser,
  moduleId: number
): Promise<{ ok: true; value: ModuleMeetingSettings } | { ok: false; status: number; error: string }> {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: {
      absenceThreshold: true,
      minutesEditWindowDays: true,
      allowAnyoneToEditMeetings: true,
      allowAnyoneToRecordAttendance: true,
      allowAnyoneToWriteMinutes: true,
    },
  });

  if (!module) return { ok: false, status: 404, error: "Module not found" };

  return { ok: true, value: module };
}

export async function updateModuleMeetingSettings(
  enterpriseUser: EnterpriseUser,
  moduleId: number,
  data: {
    absenceThreshold: number;
    minutesEditWindowDays: number;
    allowAnyoneToEditMeetings: boolean;
    allowAnyoneToRecordAttendance: boolean;
    allowAnyoneToWriteMinutes: boolean;
  }
): Promise<{ ok: true; value: ModuleMeetingSettings } | { ok: false; status: number; error: string }> {
  const canManage = await canManageModuleAccess(enterpriseUser, moduleId);
  if (!canManage) return { ok: false, status: 403, error: "Forbidden" };

  const module = await prisma.module.findFirst({
    where: { id: moduleId, enterpriseId: enterpriseUser.enterpriseId },
    select: { id: true },
  });
  if (!module) return { ok: false, status: 404, error: "Module not found" };

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: {
      absenceThreshold: data.absenceThreshold,
      minutesEditWindowDays: data.minutesEditWindowDays,
      allowAnyoneToEditMeetings: data.allowAnyoneToEditMeetings,
      allowAnyoneToRecordAttendance: data.allowAnyoneToRecordAttendance,
      allowAnyoneToWriteMinutes: data.allowAnyoneToWriteMinutes,
    },
    select: {
      absenceThreshold: true,
      minutesEditWindowDays: true,
      allowAnyoneToEditMeetings: true,
      allowAnyoneToRecordAttendance: true,
      allowAnyoneToWriteMinutes: true,
    },
  });

  return { ok: true, value: updated };
}
