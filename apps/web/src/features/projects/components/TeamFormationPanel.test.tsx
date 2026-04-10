import { describe, expect, it } from "vitest";
import { TeamFormationPanel } from "./TeamFormationPanel";

describe("TeamFormationPanel", () => {
  it("re-exports TeamFormationPanel as a function", () => {
    expect(typeof TeamFormationPanel).toBe("function");
  });
});