-- Create AuditLog table for login/logout auditing
CREATE TABLE `AuditLog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `enterpriseId` VARCHAR(191) NOT NULL,
  `userId` INT NOT NULL,
  `action` ENUM('LOGIN', 'LOGOUT') NOT NULL,
  `ip` VARCHAR(64) NULL,
  `userAgent` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AuditLog_enterpriseId_createdAt_idx`(`enterpriseId`, `createdAt`),
  INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
  CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AuditLog_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
