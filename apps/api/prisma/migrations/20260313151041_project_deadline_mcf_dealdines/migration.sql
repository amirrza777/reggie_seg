-- AlterTable
ALTER TABLE `PeerAssessment` ADD COLUMN `effectiveDueDate` DATETIME(3) NULL,
    ADD COLUMN `submittedLate` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `PeerFeedback` ADD COLUMN `effectiveDueDate` DATETIME(3) NULL,
    ADD COLUMN `submittedLate` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ProjectDeadline` ADD COLUMN `assessmentDueDateMcf` DATETIME(3) NULL,
    ADD COLUMN `feedbackDueDateMcf` DATETIME(3) NULL,
    ADD COLUMN `taskDueDateMcf` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Team` ADD COLUMN `deadlineProfile` ENUM('STANDARD', 'MCF') NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE `StudentDeadlineOverride` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `projectDeadlineId` INTEGER NOT NULL,
    `createdByUserId` INTEGER NULL,
    `taskOpenDate` DATETIME(3) NULL,
    `taskDueDate` DATETIME(3) NULL,
    `assessmentOpenDate` DATETIME(3) NULL,
    `assessmentDueDate` DATETIME(3) NULL,
    `feedbackOpenDate` DATETIME(3) NULL,
    `feedbackDueDate` DATETIME(3) NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentDeadlineOverride_projectDeadlineId_idx`(`projectDeadlineId`),
    INDEX `StudentDeadlineOverride_createdByUserId_idx`(`createdByUserId`),
    UNIQUE INDEX `StudentDeadlineOverride_userId_projectDeadlineId_key`(`userId`, `projectDeadlineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StudentDeadlineOverride` ADD CONSTRAINT `StudentDeadlineOverride_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentDeadlineOverride` ADD CONSTRAINT `StudentDeadlineOverride_projectDeadlineId_fkey` FOREIGN KEY (`projectDeadlineId`) REFERENCES `ProjectDeadline`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentDeadlineOverride` ADD CONSTRAINT `StudentDeadlineOverride_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
