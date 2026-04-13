import { describe, expect, it } from "vitest";

import { buildScenarioMemberIds, validateScenarioPrerequisites } from "../../../prisma/seed/teamHealthScenario/actors";
import { buildOpenScenarioMessages, buildResolvedScenarioMessage, buildScenarioTeamHealthMessageRows } from "../../../prisma/seed/teamHealthScenario/messages";
import { buildTeamHealthScenarioDetails } from "../../../prisma/seed/teamHealthScenario/summary";
import { toDateFromNow } from "../../../prisma/seed/teamHealthScenario/time";
import { uniquePositiveIds } from "../../../prisma/seed/scenarioUtils";
import { makeSeedContext } from "../test-helpers/seed-context";

describe("team-health warning pure helpers", () => {
  it("buildScenarioMemberIds includes reviewer and deduplicates positive ids", () => {
    const context = makeSeedContext({
      usersByRole: {
        students: [
          { id: 101, role: "STUDENT", email: "s1@example.com" },
          { id: 102, role: "STUDENT", email: "s2@example.com" },
          { id: 103, role: "STUDENT", email: "s3@example.com" },
          { id: 104, role: "STUDENT", email: "s4@example.com" },
        ],
        adminOrStaff: [{ id: 900, role: "STAFF", email: "staff@example.com" }],
      },
    });
    const memberIds = buildScenarioMemberIds(context, 101, 900);
    expect(memberIds).toEqual(expect.arrayContaining([101, 102, 103, 104, 900]));
    expect(uniquePositiveIds([1, 2, 2, -1, 0])).toEqual([1, 2]);
  });

  it("validateScenarioPrerequisites returns expected guard failures", () => {
    expect(validateScenarioPrerequisites(null, 21, 101, [101, 102]).ok).toBe(false);
    expect(validateScenarioPrerequisites(11, null, 101, [101, 102]).ok).toBe(false);
    expect(validateScenarioPrerequisites(11, 21, null, [101, 102]).ok).toBe(false);
    expect(validateScenarioPrerequisites(11, 21, 101, [101]).ok).toBe(false);
    expect(validateScenarioPrerequisites(11, 21, 101, [101, 102]).ok).toBe(true);
  });

  it("builds open/resolved message payloads with expected shape", () => {
    const openRows = buildOpenScenarioMessages(31, 41, 101);
    expect(openRows).toHaveLength(3);
    expect(openRows.every((row) => row.resolved === false)).toBe(true);

    const resolved = buildResolvedScenarioMessage(31, 41, 101, 901);
    expect(resolved.resolved).toBe(true);
    expect(resolved.reviewedByUserId).toBe(901);

    const allRows = buildScenarioTeamHealthMessageRows(31, 41, 101, 901);
    expect(allRows).toHaveLength(4);
  });

  it("buildTeamHealthScenarioDetails includes existing scenario suffix only when seeded", () => {
    const withoutExisting = buildTeamHealthScenarioDetails(31, 41, 2, 1, 0, { seeded: false });
    const withExisting = buildTeamHealthScenarioDetails(31, 41, 2, 1, 0, { seeded: true, projectId: 50, teamId: 60 });
    expect(withoutExisting).toContain("project=31");
    expect(withoutExisting).not.toContain("existingSeProject=");
    expect(withExisting).toContain("existingSeProject=50");
    expect(withExisting).toContain("existingSeTeam=60");
  });

  it("toDateFromNow returns a forward timestamp for positive offsets", () => {
    expect(toDateFromNow(1).getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});
