/*
  Warnings:

  - You are about to drop the column `moduleId` on the `PeerAssessment` table. All the data in the column will be lost.
  - You are about to drop the column `questionnaireTemplateId` on the `PeerAssessment` table. All the data in the column will be lost.
  - You are about to drop the column `moduleId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the `PeerAssessmentReview` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Module` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,teamId,reviewerUserId,revieweeUserId]` on the table `PeerAssessment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,teamName]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `PeerFeedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `PeerAssessment` DROP FOREIGN KEY `PeerAssessment_moduleId_fkey`;

-- DropForeignKey
ALTER TABLE `PeerAssessment` DROP FOREIGN KEY `PeerAssessment_questionnaireTemplateId_fkey`;

-- DropForeignKey
ALTER TABLE `PeerAssessment` DROP FOREIGN KEY `PeerAssessment_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `PeerAssessmentReview` DROP FOREIGN KEY `PeerAssessmentReview_peerAssessmentId_fkey`;

-- DropForeignKey
ALTER TABLE `PeerFeedback` DROP FOREIGN KEY `PeerFeedback_peerAssessmentId_fkey`;

-- DropForeignKey
ALTER TABLE `Team` DROP FOREIGN KEY `Team_moduleId_fkey`;

-- DropIndex
DROP INDEX `PeerAssessment_moduleId_idx` ON `PeerAssessment`;

-- DropIndex
DROP INDEX `PeerAssessment_moduleId_projectId_teamId_reviewerUserId_revi_key` ON `PeerAssessment`;

-- DropIndex
DROP INDEX `PeerAssessment_questionnaireTemplateId_fkey` ON `PeerAssessment`;

-- DropIndex
DROP INDEX `Team_moduleId_idx` ON `Team`;

-- DropIndex
DROP INDEX `Team_teamName_key` ON `Team`;

-- AlterTable
ALTER TABLE `PeerAssessment` DROP COLUMN `moduleId`,
    DROP COLUMN `questionnaireTemplateId`;

-- AlterTable
ALTER TABLE `PeerFeedback` ADD COLUMN `teamId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Team` DROP COLUMN `moduleId`,
    ADD COLUMN `projectId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `PeerAssessmentReview`;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `questionnaireTemplateId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Project_moduleId_idx`(`moduleId`),
    INDEX `Project_questionnaireTemplateId_idx`(`questionnaireTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectDeadline` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `assessmentOpenDate` DATETIME(3) NOT NULL,
    `assessmentDueDate` DATETIME(3) NOT NULL,
    `feedbackOpenDate` DATETIME(3) NOT NULL,
    `feedbackDueDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProjectDeadline_projectId_key`(`projectId`),
    INDEX `ProjectDeadline_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamDeadlineOverride` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `projectDeadlineId` INTEGER NOT NULL,
    `assessmentOpenDate` DATETIME(3) NULL,
    `assessmentDueDate` DATETIME(3) NULL,
    `feedbackOpenDate` DATETIME(3) NULL,
    `feedbackDueDate` DATETIME(3) NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TeamDeadlineOverride_teamId_key`(`teamId`),
    INDEX `TeamDeadlineOverride_projectDeadlineId_idx`(`projectDeadlineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Module_name_key` ON `Module`(`name`);

-- CreateIndex
CREATE INDEX `PeerAssessment_templateId_idx` ON `PeerAssessment`(`templateId`);

-- CreateIndex
CREATE UNIQUE INDEX `PeerAssessment_projectId_teamId_reviewerUserId_revieweeUserI_key` ON `PeerAssessment`(`projectId`, `teamId`, `reviewerUserId`, `revieweeUserId`);

-- CreateIndex
CREATE INDEX `PeerFeedback_teamId_idx` ON `PeerFeedback`(`teamId`);

-- CreateIndex
CREATE INDEX `PeerFeedback_peerAssessmentId_idx` ON `PeerFeedback`(`peerAssessmentId`);

-- CreateIndex
CREATE INDEX `PeerFeedback_reviewerUserId_idx` ON `PeerFeedback`(`reviewerUserId`);

-- CreateIndex
CREATE INDEX `PeerFeedback_revieweeUserId_idx` ON `PeerFeedback`(`revieweeUserId`);

-- CreateIndex
CREATE INDEX `Team_projectId_idx` ON `Team`(`projectId`);

-- CreateIndex
CREATE UNIQUE INDEX `Team_projectId_teamName_key` ON `Team`(`projectId`, `teamName`);

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerFeedback` ADD CONSTRAINT `PeerFeedback_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerFeedback` ADD CONSTRAINT `PeerFeedback_peerAssessmentId_fkey` FOREIGN KEY (`peerAssessmentId`) REFERENCES `PeerAssessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerFeedback` ADD CONSTRAINT `PeerFeedback_reviewerUserId_fkey` FOREIGN KEY (`reviewerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerFeedback` ADD CONSTRAINT `PeerFeedback_revieweeUserId_fkey` FOREIGN KEY (`revieweeUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_questionnaireTemplateId_fkey` FOREIGN KEY (`questionnaireTemplateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectDeadline` ADD CONSTRAINT `ProjectDeadline_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamDeadlineOverride` ADD CONSTRAINT `TeamDeadlineOverride_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamDeadlineOverride` ADD CONSTRAINT `TeamDeadlineOverride_projectDeadlineId_fkey` FOREIGN KEY (`projectDeadlineId`) REFERENCES `ProjectDeadline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
