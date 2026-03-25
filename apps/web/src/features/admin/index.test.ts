import { describe, expect, it, vi } from "vitest";

vi.mock("./api/client", () => ({
  adminClientSentinel: "admin-client",
}));
vi.mock("./components/FeatureFlagsPanel", () => ({
  FeatureFlagsPanel: () => null,
}));
vi.mock("./components/FeatureFlagsCard", () => ({
  FeatureFlagsCard: () => null,
}));
vi.mock("./components/UserManagementTable", () => ({
  UserManagementTable: () => null,
}));
vi.mock("./components/EnterpriseManagementTable", () => ({
  EnterpriseManagementTable: () => null,
}));
vi.mock("./components/AdminWorkspaceSummary", () => ({
  AdminWorkspaceSummary: () => null,
}));
vi.mock("./types", () => ({
  adminTypesSentinel: "admin-types",
}));

describe("admin index barrel", () => {
  it("re-exports module surface", async () => {
    const mod = await import("./index");
    expect(mod.adminClientSentinel).toBe("admin-client");
    expect(mod.FeatureFlagsPanel).toBeTypeOf("function");
    expect(mod.FeatureFlagsCard).toBeTypeOf("function");
    expect(mod.UserManagementTable).toBeTypeOf("function");
    expect(mod.EnterpriseManagementTable).toBeTypeOf("function");
    expect(mod.AdminWorkspaceSummary).toBeTypeOf("function");
    expect(mod.adminTypesSentinel).toBe("admin-types");
  });
});
