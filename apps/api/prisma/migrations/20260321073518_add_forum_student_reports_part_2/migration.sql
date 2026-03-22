-- DropForeignKey
ALTER TABLE `ForumStudentReport` DROP FOREIGN KEY `ForumStudentReport_postId_fkey`;

-- AlterTable
ALTER TABLE `ForumStudentReport` MODIFY `reason` VARCHAR(191) NULL;
