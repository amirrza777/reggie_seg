import type { NextFunction, Response } from "express";
import { vi } from "vitest";
import router from "./router.js";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    module: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    moduleLead: { findFirst: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    moduleTeachingAssistant: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    featureFlag: { findMany: vi.fn(), update: vi.fn(), createMany: vi.fn() },
    team: { count: vi.fn() },
    meeting: { count: vi.fn() },
    userModule: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../auth/middleware.js", () => ({
  requireAuth: (req: any, _res: any, next: NextFunction) => {
    const raw = req.headers?.["x-user-id"];
    if (raw) req.user = { sub: Number(raw) };
    next();
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: mocks.prisma,
}));

export function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  (res.status as any).mockReturnValue(res);
  (res.json as any).mockReturnValue(res);
  return res as Response;
}

export function getUseHandlers() {
  return (router as any).stack.filter((layer: any) => !layer.route).map((layer: any) => layer.handle);
}

export function getRouteHandler(method: "get" | "post" | "put" | "patch" | "delete", path: string) {
  const layer = (router as any).stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) throw new Error(`Missing route ${method.toUpperCase()} ${path}`);
  return layer.route.stack[0].handle;
}

export function setupEnterpriseAdminRouterTestDefaults() {
  vi.clearAllMocks();

  (mocks.prisma.user.findUnique as any).mockResolvedValue({
    id: 99,
    enterpriseId: "ent-1",
    role: "ENTERPRISE_ADMIN",
    active: true,
  });

  (mocks.prisma.user.count as any).mockResolvedValue(5);
  (mocks.prisma.module.count as any).mockResolvedValue(2);
  (mocks.prisma.team.count as any).mockResolvedValue(1);
  (mocks.prisma.meeting.count as any).mockResolvedValue(4);

  (mocks.prisma.module.findMany as any).mockResolvedValue([]);
  (mocks.prisma.module.findFirst as any).mockResolvedValue(null);
  (mocks.prisma.module.findUnique as any).mockResolvedValue({
    id: 7,
    name: "Module 7",
    briefText: null,
    timelineText: null,
    expectationsText: null,
    readinessNotesText: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    _count: { userModules: 0, moduleLeads: 1, moduleTeachingAssistants: 0 },
  });
  (mocks.prisma.module.create as any).mockResolvedValue({ id: 7 });
  (mocks.prisma.module.delete as any).mockResolvedValue({ id: 7 });

  (mocks.prisma.user.findMany as any).mockResolvedValue([]);
  (mocks.prisma.userModule.deleteMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.userModule.createMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.moduleLead.deleteMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.moduleLead.createMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.moduleLead.findMany as any).mockResolvedValue([]);
  (mocks.prisma.moduleTeachingAssistant.deleteMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.moduleTeachingAssistant.createMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.moduleTeachingAssistant.findMany as any).mockResolvedValue([]);
  (mocks.prisma.userModule.findMany as any).mockResolvedValue([]);
  (mocks.prisma.featureFlag.createMany as any).mockResolvedValue({ count: 0 });
  (mocks.prisma.featureFlag.findMany as any).mockResolvedValue([]);
  (mocks.prisma.featureFlag.update as any).mockResolvedValue({ key: "peer_feedback", label: "Peer feedback", enabled: true });

  (mocks.prisma.$transaction as any).mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(mocks.prisma);
  });
}

export const prisma = mocks.prisma as any;
