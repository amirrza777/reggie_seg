import { withSeedLogging } from "./logging";
import type { SeedContext } from "./types";
import { runCompletedProjectScenario } from "./completed-project/scenario";

export async function seedCompletedProjectScenario(context: SeedContext) {
  return withSeedLogging("seedCompletedProjectScenario", async () => {
    const result = await runCompletedProjectScenario(context);
    if ("skippedReason" in result) {
      return { value: undefined, rows: 0, details: `skipped (${result.skippedReason})` };
    }
    return { value: undefined, rows: result.rows, details: result.details };
  });
}
