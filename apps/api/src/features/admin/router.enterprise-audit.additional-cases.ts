import { expect, it } from "vitest";
import type { Response } from "express";
import type { listAuditLogs } from "../audit/service.js";

type RouteHandler = (req: unknown, res: Response) => Promise<unknown>;

type RouterEnterpriseAuditExtraContext = {
  auditLogs: RouteHandler;
  createEnterprise: RouteHandler;
  deleteEnterprise: RouteHandler;
  inviteCurrentEnterpriseAdmin: RouteHandler;
  inviteEnterpriseAdmin: RouteHandler;
  inviteGlobalAdmin: RouteHandler;
  listEnterpriseUsers: RouteHandler;
  patchEnterpriseUser: RouteHandler;
  mockRes: () => Response;
  prisma: any;
  listAuditLogs: typeof listAuditLogs;
};

export function registerRouterEnterpriseAuditExtraTests(ctx: RouterEnterpriseAuditExtraContext) {
  it("rejects invalid enterprise-admin invite emails before enterprise lookup", async () => {
    const res = ctx.mockRes();

    await ctx.inviteEnterpriseAdmin(
      { params: { enterpriseId: "ent-2" }, body: { email: "not-an-email" }, adminUser: { id: 1 } } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(400);
    expect((res.json as any)).toHaveBeenCalledWith({ error: "Email must be a valid email address" });
    expect(ctx.prisma.enterprise.findUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid current-enterprise invite emails before enterprise lookup", async () => {
    const res = ctx.mockRes();

    await ctx.inviteCurrentEnterpriseAdmin(
      { body: { email: "not-an-email" }, adminUser: { id: 1, enterpriseId: "ent-1" } } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(400);
    expect((res.json as any)).toHaveBeenCalledWith({ error: "Email must be a valid email address" });
    expect(ctx.prisma.enterprise.findUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid global-admin invite emails before token creation", async () => {
    const res = ctx.mockRes();

    await ctx.inviteGlobalAdmin(
      { body: { email: "not-an-email" }, adminUser: { id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1" } } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(400);
    expect((res.json as any)).toHaveBeenCalledWith({ error: "Email must be a valid email address" });
    expect(ctx.prisma.globalAdminInviteToken.create).not.toHaveBeenCalled();
  });

  it("creates a global-admin invite token and response payload for eligible emails", async () => {
    const res = ctx.mockRes();

    await ctx.inviteGlobalAdmin(
      { body: { email: "invite@example.com" }, adminUser: { id: 1, email: "admin@kcl.ac.uk", enterpriseId: "ent-1" } } as any,
      res,
    );

    expect(ctx.prisma.globalAdminInviteToken.updateMany).toHaveBeenCalled();
    expect(ctx.prisma.globalAdminInviteToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "invite@example.com",
          invitedByUserId: 1,
        }),
      }),
    );
    expect((res.status as any)).toHaveBeenCalledWith(201);
    expect((res.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ email: "invite@example.com" }),
    );
  });

  it("rejects current-enterprise invites when admin enterprise context is missing", async () => {
    const res = ctx.mockRes();

    await ctx.inviteCurrentEnterpriseAdmin(
      { body: { email: "invite@example.com" }, adminUser: { id: 1 } } as any,
      res,
    );

    expect((res.status as any)).toHaveBeenCalledWith(400);
    expect((res.json as any)).toHaveBeenCalledWith({ error: "Enterprise context is required" });
    expect(ctx.prisma.enterprise.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when listing users for missing enterprise", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce(null);
    const res = ctx.mockRes();

    await ctx.listEnterpriseUsers({ params: { enterpriseId: "ent-missing" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("lists enterprise users with isStaff mapping", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce({ id: "ent-2" });
    ctx.prisma.user.findMany.mockResolvedValueOnce([
      { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STUDENT", active: true },
    ]);
    const res = ctx.mockRes();

    await ctx.listEnterpriseUsers({ params: { enterpriseId: "ent-2" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith([expect.objectContaining({ isStaff: false })]);
  });

  it("validates patchEnterpriseUser id", async () => {
    const res = ctx.mockRes();
    await ctx.patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "bad" }, body: {} } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when patchEnterpriseUser target is missing", async () => {
    ctx.prisma.user.findFirst.mockResolvedValueOnce(null);
    const res = ctx.mockRes();

    await ctx.patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("blocks patchEnterpriseUser updates for protected admin account", async () => {
    ctx.prisma.user.findFirst.mockResolvedValueOnce({ id: 2, email: "admin@kcl.ac.uk" });
    const res = ctx.mockRes();

    await ctx.patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("updates enterprise user and returns mapped payload", async () => {
    ctx.prisma.user.findFirst.mockResolvedValueOnce({ id: 2, email: "u@x.com" });
    ctx.prisma.user.update.mockResolvedValueOnce({ id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "ADMIN", active: false });
    const res = ctx.mockRes();

    await ctx.patchEnterpriseUser({ params: { enterpriseId: "ent-2", id: "2" }, body: { active: false, role: "ADMIN" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ isStaff: true }));
  });

  it("allows assigning ENTERPRISE_ADMIN through enterprise user management", async () => {
    ctx.prisma.user.findFirst.mockResolvedValueOnce({
      id: 2,
      email: "u@x.com",
      enterpriseId: "ent-2",
      role: "STAFF",
      active: true,
    });
    ctx.prisma.user.update.mockResolvedValueOnce({
      id: 2,
      email: "u@x.com",
      firstName: "U",
      lastName: "X",
      role: "ENTERPRISE_ADMIN",
      active: true,
    });
    const res = ctx.mockRes();

    await ctx.patchEnterpriseUser(
      { params: { enterpriseId: "ent-2", id: "2" }, body: { role: "ENTERPRISE_ADMIN" }, adminUser: { id: 1 } } as any,
      res,
    );

    expect(ctx.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: { role: "ENTERPRISE_ADMIN" },
      }),
    );
    expect((res.json as any)).toHaveBeenCalledWith(expect.objectContaining({ role: "ENTERPRISE_ADMIN", isStaff: true }));
  });

  it("validates deleteEnterprise target id", async () => {
    const res = ctx.mockRes();
    await ctx.deleteEnterprise({ params: { enterpriseId: "" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("forbids deleting the current admin enterprise", async () => {
    const res = ctx.mockRes();
    await ctx.deleteEnterprise({ params: { enterpriseId: "ent-1" }, adminUser: { enterpriseId: "ent-1" } } as any, res);
    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when deleteEnterprise target is missing", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce(null);
    const res = ctx.mockRes();

    await ctx.deleteEnterprise({ params: { enterpriseId: "ent-missing" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(404);
  });

  it("rejects deleteEnterprise when active related records exist", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce({
      id: "ent-busy",
      _count: { users: 1, modules: 0, teams: 0, auditLogs: 0 },
    });
    const res = ctx.mockRes();

    await ctx.deleteEnterprise({ params: { enterpriseId: "ent-busy" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(400);
  });

  it("deletes enterprise audit logs before deletion when present", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce({
      id: "ent-clean",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 2 },
    });
    const res = ctx.mockRes();

    await ctx.deleteEnterprise({ params: { enterpriseId: "ent-clean" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect(ctx.prisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { enterpriseId: "ent-clean" } });
  });

  it("deletes enterprise when no dependent records remain", async () => {
    ctx.prisma.enterprise.findUnique.mockResolvedValueOnce({
      id: "ent-clean2",
      _count: { users: 0, modules: 0, teams: 0, auditLogs: 0 },
    });
    const res = ctx.mockRes();

    await ctx.deleteEnterprise({ params: { enterpriseId: "ent-clean2" }, adminUser: { enterpriseId: "ent-1" } } as any, res);

    expect((res.json as any)).toHaveBeenCalledWith({ success: true });
  });

  it("requires enterprise context for audit logs", async () => {
    const res = ctx.mockRes();

    await ctx.auditLogs({ adminUser: undefined, query: {} } as any, res);

    expect((res.status as any)).toHaveBeenCalledWith(500);
  });

  it("parses audit-log filters and maps response payload", async () => {
    (ctx.listAuditLogs as any).mockResolvedValueOnce([
      {
        id: 1,
        action: "LOGIN",
        createdAt: new Date("2026-03-01"),
        ip: "1.1.1.1",
        userAgent: "ua",
        user: { id: 2, email: "u@x.com", firstName: "U", lastName: "X", role: "STAFF" },
      },
    ]);
    const res = ctx.mockRes();

    await ctx.auditLogs({ adminUser: { enterpriseId: "ent-1" }, query: { from: "bad", to: "2026-03-02", limit: "5" } } as any, res);

    expect(ctx.listAuditLogs).toHaveBeenCalledWith({
      enterpriseId: "ent-1",
      from: undefined,
      to: new Date("2026-03-02"),
      limit: 5,
    });
    expect((res.json as any)).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 1,
        action: "LOGIN",
        user: expect.objectContaining({ id: 2, email: "u@x.com", role: "STAFF" }),
      }),
    ]);
  });
}
