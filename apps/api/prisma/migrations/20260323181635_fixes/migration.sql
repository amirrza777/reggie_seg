-- AlterTable
ALTER TABLE `Module` MODIFY `joinCode` VARCHAR(191) NOT NULL,
    MODIFY `code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Team` MODIFY `peerAssessmentAlertSentAt` DATETIME(3) NULL;
