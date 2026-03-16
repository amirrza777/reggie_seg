-- CreateTable
CREATE TABLE `MCFRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `requesterUserId` INTEGER NOT NULL,
    `reviewedByUserId` INTEGER NULL,
    `subject` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,

    INDEX `MCFRequest_projectId_idx`(`projectId`),
    INDEX `MCFRequest_teamId_idx`(`teamId`),
    INDEX `MCFRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `MCFRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `MCFRequest_projectId_teamId_status_idx`(`projectId`, `teamId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MCFRequest` ADD CONSTRAINT `MCFRequest_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCFRequest` ADD CONSTRAINT `MCFRequest_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCFRequest` ADD CONSTRAINT `MCFRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCFRequest` ADD CONSTRAINT `MCFRequest_reviewedByUserId_fkey` FOREIGN KEY (`reviewedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
