/*
  Warnings:

  - You are about to drop the `questionnaireTemplate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `questionnaireTemplateId` to the `PeerAssessment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PeerAssessment` ADD COLUMN `questionnaireTemplateId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `questionnaireTemplate`;

-- CreateTable
CREATE TABLE `Question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `templateId` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuestionnaireTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `templateName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QuestionnaireTemplate_id_idx`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_questionnaireTemplateId_fkey` FOREIGN KEY (`questionnaireTemplateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
