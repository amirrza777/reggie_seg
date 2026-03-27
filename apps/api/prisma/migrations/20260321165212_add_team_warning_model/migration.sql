-- CreateTable
CREATE TABLE `TeamWarning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(160) NOT NULL,
    `details` TEXT NOT NULL,
    `source` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,

    INDEX `TeamWarning_projectId_idx`(`projectId`),
    INDEX `TeamWarning_teamId_idx`(`teamId`),
    INDEX `TeamWarning_createdByUserId_idx`(`createdByUserId`),
    INDEX `TeamWarning_projectId_teamId_active_idx`(`projectId`, `teamId`, `active`),
    INDEX `TeamWarning_type_active_idx`(`type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamWarning` ADD CONSTRAINT `TeamWarning_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamWarning` ADD CONSTRAINT `TeamWarning_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamWarning` ADD CONSTRAINT `TeamWarning_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
