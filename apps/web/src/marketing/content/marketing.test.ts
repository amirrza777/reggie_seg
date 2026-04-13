import { describe, expect, it } from "vitest";
import { buildMarqueeSet, marqueeLogos, marqueeSets } from "./marketing";

describe("marketing content", () => {
  it("builds marquee sets until min count is reached", () => {
    const set = buildMarqueeSet(marqueeLogos, 20);
    expect(set.length).toBeGreaterThanOrEqual(20);
    expect(set[0]).toEqual(marqueeLogos[0]);

    expect(marqueeSets).toHaveLength(2);
    expect(marqueeSets[0].length).toBeGreaterThanOrEqual(20);
  });

  it("returns an empty marquee set when source logos are empty", () => {
    expect(buildMarqueeSet([], 10)).toEqual([]);
  });
});
