import dotenv from "dotenv";
import { app } from "./app.js";
import { startNotificationJob } from "./shared/notificationJob.js";
import { prisma } from "./shared/db.js";
import { startAuditRetentionJob } from "./features/audit/retentionJob.js";

dotenv.config();

const BOOTSTRAP_ENTERPRISES = [
  { code: "DEFAULT", name: "Default Enterprise" },
  ...(process.env.NODE_ENV === "production" ? [] : [{ code: "LOCALDEV", name: "Local Development Enterprise" }]),
] as const;

export function resolveServerAddress() {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";
  return { host, port };
}

export async function bootstrap() {
  for (const enterprise of BOOTSTRAP_ENTERPRISES) {
    await prisma.enterprise.upsert({
      where: { code: enterprise.code },
      update: {},
      create: { code: enterprise.code, name: enterprise.name },
    });
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (adminEmail && adminPassword) {
    const enterprise = await prisma.enterprise.findUnique({ where: { code: "DEFAULT" }, select: { id: true } });
    if (enterprise) {
      const existing = await prisma.user.findFirst({ where: { email: adminEmail } });
      if (!existing) {
        const argon2 = await import("argon2");
        const passwordHash = await argon2.hash(adminPassword);
        await prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            firstName: "Admin",
            lastName: "User",
            role: "ADMIN",
            enterpriseId: enterprise.id,
          },
        });
        console.log(`Admin user created: ${adminEmail}`);
      }
    }
  }
}

export async function startServer() {
  try {
    await bootstrap();
    const { host, port } = resolveServerAddress();
    app.listen(port, host, () => {
      console.log(`API listening on http://${host}:${port}`);
      startNotificationJob();
      startAuditRetentionJob();
    });
  } catch (err) {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  }
}

export function shouldAutoStart(
  isTestRuntime = process.env.NODE_ENV === "test" || Boolean(import.meta.vitest)
) {
  return !isTestRuntime;
}

export async function maybeStartServer(
  isTestRuntime = process.env.NODE_ENV === "test" || Boolean(import.meta.vitest)
) {
  if (!shouldAutoStart(isTestRuntime)) return;
  await startServer();
}

void maybeStartServer();
