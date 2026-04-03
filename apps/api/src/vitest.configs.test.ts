import { describe, expect, it } from "vitest";
import moduleJoinConfig from "../vitest.modulejoin.config.ts";
import seedConfig from "../vitest.seed.config.ts";

describe("vitest specialized configs", () => {
  it("exports moduleJoin config with expected include and coverage settings", () => {
    expect(moduleJoinConfig.test?.include).toEqual(["src/features/moduleJoin/**/*.test.ts"]);
    expect(moduleJoinConfig.test?.coverage?.include).toEqual(["src/features/moduleJoin/**/*.ts"]);
    expect(moduleJoinConfig.test?.coverage?.reportsDirectory).toBe("coverage-modulejoin");
  });

  it("exports seed config with expected include and coverage settings", () => {
    expect(seedConfig.test?.include).toEqual(["src/prisma/**/*.test.ts"]);
    expect(seedConfig.test?.coverage?.include).toEqual(["prisma/seed/**/*.ts", "src/prisma/**/*.ts"]);
    expect(seedConfig.test?.coverage?.reportsDirectory).toBe("coverage-seed");
  });
});
