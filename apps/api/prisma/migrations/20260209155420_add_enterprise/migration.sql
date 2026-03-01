-- Create Enterprise table
CREATE TABLE `Enterprise` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Enterprise_code_key`(`code`),
    INDEX `Enterprise_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default enterprise for backfill
INSERT INTO `Enterprise` (`id`, `code`, `name`)
VALUES ('ent_default', 'DEFAULT', 'Default Enterprise');

-- Add enterpriseId columns (nullable for backfill)
ALTER TABLE `User` ADD COLUMN `enterpriseId` VARCHAR(191) NULL;
ALTER TABLE `Module` ADD COLUMN `enterpriseId` VARCHAR(191) NULL;
ALTER TABLE `Team` ADD COLUMN `enterpriseId` VARCHAR(191) NULL;

-- Backfill existing rows
UPDATE `User` SET `enterpriseId` = 'ent_default' WHERE `enterpriseId` IS NULL;
UPDATE `Module` SET `enterpriseId` = 'ent_default' WHERE `enterpriseId` IS NULL;
UPDATE `Team` SET `enterpriseId` = 'ent_default' WHERE `enterpriseId` IS NULL;

-- Drop existing unique indexes before replacing with enterprise-scoped uniques
DROP INDEX `User_email_key` ON `User`;
DROP INDEX `Team_teamName_key` ON `Team`;

-- Enforce required enterpriseId
ALTER TABLE `User` MODIFY `enterpriseId` VARCHAR(191) NOT NULL;
ALTER TABLE `Module` MODIFY `enterpriseId` VARCHAR(191) NOT NULL;
ALTER TABLE `Team` MODIFY `enterpriseId` VARCHAR(191) NOT NULL;

-- Add enterpriseId indexes
CREATE INDEX `User_enterpriseId_idx` ON `User`(`enterpriseId`);
CREATE INDEX `Module_enterpriseId_idx` ON `Module`(`enterpriseId`);
CREATE INDEX `Team_enterpriseId_idx` ON `Team`(`enterpriseId`);

-- Add enterprise-scoped unique indexes
CREATE UNIQUE INDEX `User_enterpriseId_email_key` ON `User`(`enterpriseId`, `email`);
CREATE UNIQUE INDEX `Team_enterpriseId_teamName_key` ON `Team`(`enterpriseId`, `teamName`);

-- Add foreign keys
ALTER TABLE `User` ADD CONSTRAINT `User_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Module` ADD CONSTRAINT `Module_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Team` ADD CONSTRAINT `Team_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
