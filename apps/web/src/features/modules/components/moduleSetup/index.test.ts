import { describe, expect, it } from "vitest";
import {
  ModuleGuidanceSection,
  ModuleStaffAccessSection,
  StaffModuleAccessForm,
  StaffModuleStudentAccessForm,
} from "./index";
import { ModuleGuidanceSection as DirectModuleGuidanceSection } from "./ModuleGuidanceSection";
import { ModuleStaffAccessSection as DirectModuleStaffAccessSection } from "./ModuleStaffAccessSection";
import { StaffModuleAccessForm as DirectStaffModuleAccessForm } from "./StaffModuleAccessForm";
import { StaffModuleStudentAccessForm as DirectStaffModuleStudentAccessForm } from "./StaffModuleStudentAccessForm";

describe("moduleSetup barrel exports", () => {
  it("re-exports module setup components", () => {
    expect(ModuleGuidanceSection).toBe(DirectModuleGuidanceSection);
    expect(ModuleStaffAccessSection).toBe(DirectModuleStaffAccessSection);
    expect(StaffModuleAccessForm).toBe(DirectStaffModuleAccessForm);
    expect(StaffModuleStudentAccessForm).toBe(DirectStaffModuleStudentAccessForm);
  });
});
