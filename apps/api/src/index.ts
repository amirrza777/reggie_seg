import dotenv from "dotenv";
import { app } from "./app.js";
import { startNotificationJob } from "./shared/notificationJob.js";
import { prisma } from "./shared/db.js";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  await prisma.enterprise.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: { code: "DEFAULT", name: "Default Enterprise" },
  });

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

bootstrap()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`API listening on http://${host}:${port}`);
      startNotificationJob();
    });
  })
  .catch((err) => {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  });
