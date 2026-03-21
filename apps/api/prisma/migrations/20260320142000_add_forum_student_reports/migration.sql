-- CreateTable
CREATE TABLE `ForumStudentReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `postId` INTEGER NOT NULL,
    `reporterId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'IGNORED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` INTEGER NULL,

    INDEX `ForumStudentReport_projectId_createdAt_idx`(`projectId`, `createdAt`),
    INDEX `ForumStudentReport_postId_status_idx`(`postId`, `status`),
    INDEX `ForumStudentReport_reporterId_createdAt_idx`(`reporterId`, `createdAt`),
    INDEX `ForumStudentReport_reviewedById_idx`(`reviewedById`),
    UNIQUE INDEX `ForumStudentReport_postId_reporterId_key`(`postId`, `reporterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ForumStudentReport` ADD CONSTRAINT `ForumStudentReport_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumStudentReport` ADD CONSTRAINT `ForumStudentReport_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DiscussionPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumStudentReport` ADD CONSTRAINT `ForumStudentReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumStudentReport` ADD CONSTRAINT `ForumStudentReport_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
