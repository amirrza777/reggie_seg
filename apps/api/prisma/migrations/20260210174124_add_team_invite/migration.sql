/*
  Warnings:

  - You are about to drop the `PeerAssessmentReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `PeerAssessmentReview` DROP FOREIGN KEY `PeerAssessmentReview_peerAssessmentId_fkey`;

-- DropTable
DROP TABLE `PeerAssessmentReview`;

-- CreateTable
CREATE TABLE `TeamInvite` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` INTEGER NOT NULL,
    `inviterId` INTEGER NOT NULL,
    `inviteeId` INTEGER NULL,
    `inviteeEmail` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `tokenHash` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `message` VARCHAR(191) NULL,

    UNIQUE INDEX `TeamInvite_tokenHash_key`(`tokenHash`),
    INDEX `TeamInvite_teamId_idx`(`teamId`),
    INDEX `TeamInvite_inviterId_idx`(`inviterId`),
    INDEX `TeamInvite_inviteeEmail_idx`(`inviteeEmail`),
    UNIQUE INDEX `TeamInvite_teamId_inviteeEmail_active_key`(`teamId`, `inviteeEmail`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamInvite` ADD CONSTRAINT `TeamInvite_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInvite` ADD CONSTRAINT `TeamInvite_inviterId_fkey` FOREIGN KEY (`inviterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInvite` ADD CONSTRAINT `TeamInvite_inviteeId_fkey` FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
