import { describe, expect, it } from "vitest";
import * as barrel from "./useEnterpriseModuleCreateFormState";
import * as source from "./hooks/useEnterpriseModuleCreateFormState";

describe("enterprise module create form state barrel", () => {
  it("re-exports the hook module", () => {
    expect(barrel.useEnterpriseModuleCreateFormState).toBe(source.useEnterpriseModuleCreateFormState);
  });
});
