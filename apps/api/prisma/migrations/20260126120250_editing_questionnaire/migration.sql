-- DropForeignKey
ALTER TABLE `Question` DROP FOREIGN KEY `Question_templateId_fkey`;

-- DropIndex
DROP INDEX `Question_templateId_fkey` ON `Question`;

-- AlterTable
ALTER TABLE `Question` ADD COLUMN `configs` JSON NULL;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
