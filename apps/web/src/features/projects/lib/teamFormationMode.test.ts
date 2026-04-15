import { describe, expect, it } from "vitest";
import { resolveStudentTeamFormationMode } from "./teamFormationMode";

describe("resolveStudentTeamFormationMode", () => {
  it("defaults to self when no project is provided", () => {
    expect(resolveStudentTeamFormationMode(null)).toBe("self");
    expect(resolveStudentTeamFormationMode(undefined)).toBe("self");
  });

  it("returns staff when project or module is archived", () => {
    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        archivedAt: "2026-04-01T00:00:00.000Z",
      } as any),
    ).toBe("staff");

    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        moduleArchivedAt: "2026-04-01T00:00:00.000Z",
      } as any),
    ).toBe("staff");
  });

  it("returns custom when allocation template exists", () => {
    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        teamAllocationQuestionnaireTemplateId: 9,
      } as any),
    ).toBe("custom");
  });

  it("does not treat peer-assessment manual mode as custom allocation", () => {
    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        projectNavFlags: {
          peerModes: {
            peer_assessment: "MANUAL",
          },
        },
      } as any),
    ).toBe("self");
  });

  it("returns staff when team tab is hidden in active or completed state", () => {
    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        projectNavFlags: {
          active: { team: false },
        },
      } as any),
    ).toBe("staff");

    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        projectNavFlags: {
          completed: { team: false },
        },
      } as any),
    ).toBe("staff");
  });

  it("returns self for normal active projects", () => {
    expect(
      resolveStudentTeamFormationMode({
        id: "1",
        name: "P",
        questionnaireTemplateId: 1,
        projectNavFlags: {
          active: { team: true },
          completed: { team: true },
          peerModes: { peer_assessment: "NATURAL" },
        },
      } as any),
    ).toBe("self");
  });
});
