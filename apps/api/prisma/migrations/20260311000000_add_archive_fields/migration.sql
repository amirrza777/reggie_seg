-- AlterTable
ALTER TABLE `Module` ADD COLUMN `archivedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `archivedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Team` ADD COLUMN `archivedAt` DATETIME(3) NULL;
