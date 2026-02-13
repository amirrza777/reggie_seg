-- DropForeignKey
ALTER TABLE `TeamAllocation` DROP FOREIGN KEY `TeamAllocation_teamId_fkey`;

-- AlterTable
ALTER TABLE `Team` ADD COLUMN `trelloBoardId` VARCHAR(191) NULL,
    ADD COLUMN `trelloOwnerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `trelloToken` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_trelloOwnerId_fkey` FOREIGN KEY (`trelloOwnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamAllocation` ADD CONSTRAINT `TeamAllocation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
