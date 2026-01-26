ALTER TABLE `Team` DROP FOREIGN KEY `Team_userId_fkey`;

DROP INDEX `Team_teamName_userId_key` ON `Team`;

DROP INDEX `Team_userId_fkey` ON `Team`;

ALTER TABLE `Team` DROP COLUMN `userId`;
