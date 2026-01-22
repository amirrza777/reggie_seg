-- CreateTable
CREATE TABLE `PeerAssessment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleId` INTEGER NOT NULL,
    `projectId` INTEGER NULL,
    `teamId` INTEGER NOT NULL,
    `reviewerUserId` INTEGER NOT NULL,
    `revieweeUserId` INTEGER NOT NULL,
    `templateId` INTEGER NOT NULL,
    `answersJson` JSON NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PeerAssessment_moduleId_idx`(`moduleId`),
    INDEX `PeerAssessment_projectId_idx`(`projectId`),
    INDEX `PeerAssessment_teamId_idx`(`teamId`),
    INDEX `PeerAssessment_reviewerUserId_idx`(`reviewerUserId`),
    INDEX `PeerAssessment_revieweeUserId_idx`(`revieweeUserId`),
    UNIQUE INDEX `PeerAssessment_moduleId_projectId_teamId_reviewerUserId_revi_key`(`moduleId`, `projectId`, `teamId`, `reviewerUserId`, `revieweeUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_reviewerUserId_fkey` FOREIGN KEY (`reviewerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeerAssessment` ADD CONSTRAINT `PeerAssessment_revieweeUserId_fkey` FOREIGN KEY (`revieweeUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
