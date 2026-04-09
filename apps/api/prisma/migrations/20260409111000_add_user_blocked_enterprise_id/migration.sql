ALTER TABLE `User`
  ADD COLUMN `blockedEnterpriseId` VARCHAR(191) NULL;

CREATE INDEX `User_blockedEnterpriseId_idx` ON `User`(`blockedEnterpriseId`);
