ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_userId_fkey`;

ALTER TABLE `AuditLog`
  ADD CONSTRAINT `AuditLog_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog`(`createdAt`);

CREATE TABLE `AuditLogIntegrity` (
  `enterpriseId` VARCHAR(191) NOT NULL,
  `logCount` INTEGER NOT NULL DEFAULT 0,
  `lastLogId` INTEGER NULL,
  `lastLogCreatedAt` DATETIME(3) NULL,
  `signature` CHAR(64) NOT NULL DEFAULT '',
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`enterpriseId`),
  INDEX `AuditLogIntegrity_updatedAt_idx`(`updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
