import { expect, it } from "vitest";

type ServiceUserManagementExtraContext = {
  createEnterpriseUser: typeof import("./service.user-management.js").createEnterpriseUser;
  enterpriseAdminUser: { id: number; enterpriseId: string; role: string };
  platformAdminUser: { id: number; enterpriseId: string; role: string };
  prismaMock: any;
  staffUser: { id: number; enterpriseId: string; role: string };
  argon2Mock: any;
  authServiceMock: any;
  removeEnterpriseUser: typeof import("./service.user-management.js").removeEnterpriseUser;
  updateEnterpriseUser: typeof import("./service.user-management.js").updateEnterpriseUser;
};

export function registerServiceUserManagementExtraTests(ctx: ServiceUserManagementExtraContext) {
  it("forbids non-admin user updates and handles update edge cases", async () => {
    const forbidden = await ctx.updateEnterpriseUser(ctx.staffUser as any, 17, { role: "STAFF" });
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 99,
      email: "self@example.com",
      firstName: "Self",
      lastName: "User",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    const selfRemove = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 99, { active: false });
    expect(selfRemove).toEqual({ ok: false, status: 400, error: "You cannot remove your own enterprise access" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 17,
      email: "admin@kcl.ac.uk",
      firstName: "Admin",
      lastName: "Email",
      role: "STAFF",
      active: true,
    });
    const superAdminEmail = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 17, { role: "STAFF" });
    expect(superAdminEmail).toEqual({ ok: false, status: 400, error: "Cannot modify super admin" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 18,
      email: "platform@example.com",
      firstName: "Platform",
      lastName: "Admin",
      role: "ADMIN",
      active: true,
    });
    const platformAdmin = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 18, { role: "STAFF" });
    expect(platformAdmin).toEqual({ ok: false, status: 403, error: "Cannot modify platform admin accounts" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 19,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STUDENT",
      active: true,
    });
    const noChanges = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 19, {});
    expect(noChanges).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 19, membershipStatus: "active" }) }),
    );
  });

  it("handles reinstatement outcomes during updates", async () => {
    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 52,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-2",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "ENT2" },
    });

    const conflict = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 52, { active: true });
    expect(conflict).toEqual({ ok: false, status: 409, error: "User is in another enterprise" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 53,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-unassigned",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "UNASSIGNED" },
    });
    ctx.prismaMock.user.update.mockResolvedValueOnce({
      id: 53,
      email: "removed@example.com",
      firstName: "Re",
      lastName: "Moved",
      role: "STAFF",
      active: true,
    });

    const reinstated = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 53, { active: true, role: "STAFF" });
    expect(reinstated).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 53, role: "STAFF", membershipStatus: "active" }) }),
    );
  });

  it("blocks enterprise-admin role updates and handles reinstate not-found paths", async () => {
    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 92,
      email: "ea@example.com",
      firstName: "Ent",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const inviteFlowOnly = await ctx.updateEnterpriseUser(ctx.platformAdminUser as any, 92, { role: "STAFF" });
    expect(inviteFlowOnly).toEqual({
      ok: false,
      status: 403,
      error: "Enterprise admin permissions are managed by invite flow",
    });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const missingReinstateCandidate = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 1002, { active: true });
    expect(missingReinstateCandidate).toEqual({ ok: false, status: 404, error: "User not found" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1003,
      email: "platform@x.com",
      firstName: "Plat",
      lastName: "Form",
      role: "ADMIN",
      active: true,
      enterpriseId: "ent-unassigned",
      blockedEnterpriseId: "ent-1",
      enterprise: { code: "UNASSIGNED" },
    });
    const protectedCandidate = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 1003, { active: true });
    expect(protectedCandidate).toEqual({ ok: false, status: 404, error: "User not found" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 1004,
      email: "other@example.com",
      firstName: "Other",
      lastName: "Enterprise",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-2",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT2" },
    });
    const unavailableCandidate = await ctx.updateEnterpriseUser(ctx.enterpriseAdminUser as any, 1004, { active: true });
    expect(unavailableCandidate).toEqual({ ok: false, status: 404, error: "User not found" });
  });

  it("forbids non-admin creates and supports in-enterprise reinstatement", async () => {
    const forbidden = await ctx.createEnterpriseUser(ctx.staffUser as any, { email: "x@example.com" });
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 77,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STUDENT",
      active: false,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });
    ctx.prismaMock.user.update.mockResolvedValueOnce({
      id: 77,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STAFF",
      active: true,
    });

    const updated = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, {
      email: "member@example.com",
      role: "STAFF",
      firstName: "Mem",
      lastName: "Ber",
    });

    expect(updated).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 77, role: "STAFF", membershipStatus: "active" }) }),
    );
    expect(ctx.authServiceMock.sendEnterpriseAdminPromotionEmail).not.toHaveBeenCalled();
  });

  it("sends promotion confirmation when converting an existing enterprise account to enterprise admin", async () => {
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 78,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "STUDENT",
      active: true,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });
    ctx.prismaMock.user.update.mockResolvedValueOnce({
      id: 78,
      email: "member@example.com",
      firstName: "Mem",
      lastName: "Ber",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });

    const promoted = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, {
      email: "member@example.com",
      role: "ENTERPRISE_ADMIN",
    });

    expect(promoted).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ id: 78, role: "ENTERPRISE_ADMIN", membershipStatus: "active" }),
      }),
    );
    expect(ctx.authServiceMock.sendEnterpriseAdminPromotionEmail).toHaveBeenCalledWith({
      email: "member@example.com",
      firstName: "Mem",
    });
  });

  it("handles conflicting and restricted account create paths", async () => {
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 81,
        email: "conflict@example.com",
        firstName: "Con",
        lastName: "Flict",
        role: "STUDENT",
        active: true,
        enterpriseId: "ent-2",
        blockedEnterpriseId: null,
        enterprise: { code: "ENT2" },
      },
    ]);

    const conflict = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "conflict@example.com" });
    expect(conflict).toEqual({ ok: false, status: 409, error: "This email is already used in another enterprise" });

    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 82,
        email: "enterprise.admin@example.com",
        firstName: "Ent",
        lastName: "Admin",
        role: "ENTERPRISE_ADMIN",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
    ]);

    const inviteManaged = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "enterprise.admin@example.com" });
    expect(inviteManaged).toEqual({ ok: false, status: 403, error: "Enterprise admin permissions are managed by invite flow" });

    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([]);
    ctx.prismaMock.user.create.mockRejectedValueOnce({ code: "P2002" });

    const duplicateCreate = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "duplicate@example.com" });
    expect(duplicateCreate).toEqual({ ok: false, status: 409, error: "This email is already in use" });
  });

  it("handles guarded create paths for platform-admin accounts and non-unique errors", async () => {
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 201,
      email: "platform@example.com",
      firstName: "Plat",
      lastName: "Form",
      role: "ADMIN",
      active: true,
      enterpriseId: "ent-1",
      blockedEnterpriseId: null,
      enterprise: { code: "ENT1" },
    });
    const inEnterprisePlatformAdmin = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "platform@example.com" });
    expect(inEnterprisePlatformAdmin).toEqual({
      ok: false,
      status: 403,
      error: "Cannot modify platform admin accounts",
    });

    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([
      {
        id: 202,
        email: "global-platform@example.com",
        firstName: "Global",
        lastName: "Platform",
        role: "ADMIN",
        active: true,
        enterpriseId: "ent-unassigned",
        blockedEnterpriseId: "ent-1",
        enterprise: { code: "UNASSIGNED" },
      },
    ]);
    const reinstatedPlatformAdmin = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "global-platform@example.com" });
    expect(reinstatedPlatformAdmin).toEqual({
      ok: false,
      status: 403,
      error: "Cannot modify platform admin accounts",
    });

    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([]);
    ctx.prismaMock.user.create.mockRejectedValueOnce(new Error("db write failed"));
    await expect(ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: "fail@example.com" })).rejects.toThrow("db write failed");
  });

  it("creates fresh accounts when no existing matches exist", async () => {
    ctx.prismaMock.user.findUnique.mockResolvedValueOnce(null);
    ctx.prismaMock.user.findMany.mockResolvedValueOnce([]);
    ctx.prismaMock.user.create.mockResolvedValueOnce({
      id: 99,
      email: "new@example.com",
      firstName: "",
      lastName: "",
      role: "STUDENT",
      active: true,
    });

    const created = await ctx.createEnterpriseUser(ctx.enterpriseAdminUser as any, { email: " New@Example.com " });

    expect(created).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 99, email: "new@example.com" }) }),
    );
    expect(ctx.argon2Mock.hash).toHaveBeenCalled();
    expect(ctx.authServiceMock.sendPasswordSetupEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("forbids non-admin removes and handles not-found plus success removal", async () => {
    const forbidden = await ctx.removeEnterpriseUser(ctx.staffUser as any, 18);
    expect(forbidden).toEqual({ ok: false, status: 403, error: "Forbidden" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce(null);
    const missing = await ctx.removeEnterpriseUser(ctx.enterpriseAdminUser as any, 18);
    expect(missing).toEqual({ ok: false, status: 404, error: "User not found" });

    ctx.prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STAFF",
      active: true,
    });
    ctx.prismaMock.user.update.mockResolvedValueOnce({
      id: 18,
      email: "staff@example.com",
      firstName: "Sta",
      lastName: "Ff",
      role: "STUDENT",
      active: true,
    });

    const removed = await ctx.removeEnterpriseUser(ctx.platformAdminUser as any, 18);
    expect(removed).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ id: 18, membershipStatus: "left", role: "STUDENT" }) }),
    );

    expect(ctx.prismaMock.moduleLead.deleteMany).toHaveBeenCalled();
    expect(ctx.prismaMock.enterprise.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "UNASSIGNED" } }),
    );
  });
}
