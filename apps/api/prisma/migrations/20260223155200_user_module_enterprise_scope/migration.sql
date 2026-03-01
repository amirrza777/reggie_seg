-- Add enterprise scoping to UserModule and enforce tenant-safe links.

-- Add a nullable column first so existing rows can be backfilled.
ALTER TABLE `UserModule`
  ADD COLUMN `enterpriseId` VARCHAR(191) NULL;

-- Backfill from existing user-module relationships.
UPDATE `UserModule` AS `um`
JOIN `User` AS `u` ON `u`.`id` = `um`.`userId`
JOIN `Module` AS `m` ON `m`.`id` = `um`.`moduleId`
SET `um`.`enterpriseId` = `u`.`enterpriseId`
WHERE `u`.`enterpriseId` = `m`.`enterpriseId`;

-- Required for Prisma composite relation references.
CREATE UNIQUE INDEX `User_id_enterpriseId_key` ON `User`(`id`, `enterpriseId`);
CREATE UNIQUE INDEX `Module_id_enterpriseId_key` ON `Module`(`id`, `enterpriseId`);

-- Replace old single-column foreign keys with tenant-scoped composite keys.
ALTER TABLE `UserModule` DROP FOREIGN KEY `UserModule_userId_fkey`;
ALTER TABLE `UserModule` DROP FOREIGN KEY `UserModule_moduleId_fkey`;

ALTER TABLE `UserModule`
  MODIFY `enterpriseId` VARCHAR(191) NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (`enterpriseId`, `userId`, `moduleId`);

CREATE INDEX `UserModule_userId_idx` ON `UserModule`(`userId`);

ALTER TABLE `UserModule`
  ADD CONSTRAINT `UserModule_userId_enterpriseId_fkey`
    FOREIGN KEY (`userId`, `enterpriseId`) REFERENCES `User`(`id`, `enterpriseId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `UserModule_moduleId_enterpriseId_fkey`
    FOREIGN KEY (`moduleId`, `enterpriseId`) REFERENCES `Module`(`id`, `enterpriseId`) ON DELETE RESTRICT ON UPDATE CASCADE;
