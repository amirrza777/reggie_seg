import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Use TRUNCATE to reset auto-increment counters.
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `TeamAllocation`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `UserModule`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `ModuleLead`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `PeerAssessment`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `questionnaireTemplate`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `Team`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `Module`;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE `User`;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    throw err;
  });
