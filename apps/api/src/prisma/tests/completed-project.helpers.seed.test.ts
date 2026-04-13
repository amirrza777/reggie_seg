import { describe, expect, it } from "vitest";

import { buildAgreementPayload } from "../../../prisma/seed/completed-project/helpers";

describe("completed-project helper agreements", () => {
  it("uses default agreement keys when question labels are missing", () => {
    const payload = buildAgreementPayload(1, 2);
    expect(Object.keys(payload)).toEqual([
      "communication",
      "contributionVisible",
      "wouldWorkAgain",
      "followUpNeeded",
    ]);
  });
});
