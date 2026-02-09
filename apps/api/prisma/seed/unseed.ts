import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Use TRUNCATE to reset auto-increment counters.
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  const tables = [
    'MeetingAttendance',
    'MeetingComment',
    'MeetingMinutes',
    'Meeting',
    'PeerAssessmentReview',
    'PeerAssessment',
    'TeamAllocation',
    'UserModule',
    'ModuleLead',
    'Question',
    'QuestionnaireTemplate',
    'Team',
    'Module',
    'User',
    'Enterprise',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    } catch (error: any) {
      // Ignore missing tables to support older migration states.
      if (error?.meta?.code === '1146') continue;
      throw error;
    }
  }
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
