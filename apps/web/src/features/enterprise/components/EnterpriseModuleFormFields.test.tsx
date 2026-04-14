import { describe, expect, it } from "vitest";
import * as barrel from "./EnterpriseModuleFormFields";
import * as source from "./module-create/EnterpriseModuleFormFields";

describe("EnterpriseModuleFormFields barrel", () => {
  it("re-exports enterprise module edit fields and character count", () => {
    expect(barrel.EnterpriseModuleEditFields).toBe(source.EnterpriseModuleEditFields);
    expect(barrel.CharacterCount).toBe(source.CharacterCount);
  });
});
