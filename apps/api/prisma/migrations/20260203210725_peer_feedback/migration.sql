/*
  Warnings:

  - Made the column `projectId` on table `PeerAssessment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `PeerAssessment` MODIFY `projectId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `PeerFeedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `peerAssessmentId` INTEGER NOT NULL,
    `reviewerUserId` INTEGER NOT NULL,
    `revieweeUserId` INTEGER NOT NULL,
    `reviewText` VARCHAR(191) NULL,
    `agreementsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PeerFeedback_peerAssessmentId_key`(`peerAssessmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PeerFeedback` ADD CONSTRAINT `PeerFeedback_peerAssessmentId_fkey` FOREIGN KEY (`peerAssessmentId`) REFERENCES `PeerAssessment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
