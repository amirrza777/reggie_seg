/*
  Warnings:

  - You are about to drop the `MCFRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `MCFRequest` DROP FOREIGN KEY `MCFRequest_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `MCFRequest` DROP FOREIGN KEY `MCFRequest_requesterUserId_fkey`;

-- DropForeignKey
ALTER TABLE `MCFRequest` DROP FOREIGN KEY `MCFRequest_reviewedByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `MCFRequest` DROP FOREIGN KEY `MCFRequest_teamId_fkey`;

-- DropTable
DROP TABLE `MCFRequest`;

-- CreateTable
CREATE TABLE `TeamHealthMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `requesterUserId` INTEGER NOT NULL,
    `reviewedByUserId` INTEGER NULL,
    `subject` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `responseText` TEXT NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `TeamHealthMessage_projectId_idx`(`projectId`),
    INDEX `TeamHealthMessage_teamId_idx`(`teamId`),
    INDEX `TeamHealthMessage_requesterUserId_idx`(`requesterUserId`),
    INDEX `TeamHealthMessage_resolved_createdAt_idx`(`resolved`, `createdAt`),
    INDEX `TeamHealthMessage_projectId_teamId_resolved_idx`(`projectId`, `teamId`, `resolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamHealthMessage` ADD CONSTRAINT `TeamHealthMessage_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamHealthMessage` ADD CONSTRAINT `TeamHealthMessage_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamHealthMessage` ADD CONSTRAINT `TeamHealthMessage_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamHealthMessage` ADD CONSTRAINT `TeamHealthMessage_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
