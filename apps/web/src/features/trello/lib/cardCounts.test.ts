import { describe, expect, it } from "vitest";
import { countCardsByStatus } from "./cardCounts";

describe("cardCounts", () => {
  it("counts cards by mapped status including information-only", () => {
    const counts = countCardsByStatus(
      {
        l1: [{ id: "a" }, { id: "b" }],
        l2: [{ id: "c" }],
        l3: [{ id: "d" }, { id: "e" }, { id: "f" }],
        l4: [{ id: "g" }],
      },
      {
        l1: "Backlog",
        l2: "Doing",
        l3: "Done",
        l4: "Notes",
      },
      {
        Notes: "information_only",
        Done: "completed",
      },
    );

    expect(counts).toEqual({
      total: 7,
      backlog: 2,
      inProgress: 1,
      completed: 3,
      informationOnly: 1,
    });
  });
});

