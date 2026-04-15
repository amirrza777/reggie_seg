import { describe, expect, it } from "vitest";
import type { EnterpriseModuleAccessSelectionResponse } from "@/features/enterprise/types";
import {
  guidanceDefaultsFromAccessSelection,
  guidanceDefaultsSignature,
  mergeGuidanceDefaultsWithStaffRow,
  moduleGuidanceApplyToken,
} from "./moduleGuidanceDefaults";

function makeSelection(): EnterpriseModuleAccessSelectionResponse {
  return {
    module: {
      id: 9,
      name: "Module A",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      studentCount: 0,
      leaderCount: 0,
      teachingAssistantCount: 0,
      briefText: "Brief",
      expectationsText: "Expectations",
      readinessNotesText: "Readiness",
    },
    leaderIds: [],
    taIds: [],
    studentIds: [],
  };
}

describe("moduleGuidanceDefaults helpers", () => {
  it("normalizes access selection values into string defaults", () => {
    const selection = makeSelection();
    const defaults = guidanceDefaultsFromAccessSelection({
      ...selection,
      module: {
        ...selection.module,
        name: 123 as unknown as string,
        briefText: true as unknown as string,
      },
    });

    expect(defaults).toEqual({
      moduleName: "123",
      briefText: "true",
      expectationsText: "Expectations",
      readinessNotesText: "Readiness",
    });
  });

  it("returns defaults unchanged when there is no staff row", () => {
    const defaults = guidanceDefaultsFromAccessSelection(makeSelection());
    expect(mergeGuidanceDefaultsWithStaffRow(defaults, null)).toEqual(defaults);
    expect(mergeGuidanceDefaultsWithStaffRow(defaults, undefined)).toEqual(defaults);
  });

  it("merges defaults with staff row fallback values when API fields are empty", () => {
    const merged = mergeGuidanceDefaultsWithStaffRow(
      {
        moduleName: "",
        briefText: " ",
        expectationsText: "API value",
        readinessNotesText: "",
      },
      {
        title: "Fallback title",
        briefText: "Fallback brief",
        expectationsText: "Fallback expectations",
        readinessNotesText: "Fallback readiness",
      },
    );

    expect(merged).toEqual({
      moduleName: "Fallback title",
      briefText: "Fallback brief",
      expectationsText: "API value",
      readinessNotesText: "Fallback readiness",
    });
  });

  it("keeps non-empty moduleName and falls back when row title is missing", () => {
    const keepDefaultName = mergeGuidanceDefaultsWithStaffRow(
      {
        moduleName: "Already set",
        briefText: "Brief",
        expectationsText: "Expectations",
        readinessNotesText: "Readiness",
      },
      {
        title: "Ignored title",
        briefText: "Ignored brief",
        expectationsText: "Ignored expectations",
        readinessNotesText: "Ignored readiness",
      },
    );
    expect(keepDefaultName.moduleName).toBe("Already set");

    const missingTitleFallback = mergeGuidanceDefaultsWithStaffRow(
      {
        moduleName: "",
        briefText: "",
        expectationsText: "",
        readinessNotesText: "",
      },
      {
        title: undefined,
        briefText: undefined,
        expectationsText: undefined,
        readinessNotesText: undefined,
      },
    );
    expect(missingTitleFallback.moduleName).toBe("");
  });

  it("builds stable apply token and signature strings", () => {
    const selection = makeSelection();
    const defaults = guidanceDefaultsFromAccessSelection(selection);
    expect(moduleGuidanceApplyToken(selection)).toBe("9\u001f2026-01-02T00:00:00.000Z");
    expect(guidanceDefaultsSignature(defaults)).toBe("Module A\u0000Brief\u0000Expectations\u0000Readiness");
  });
});
