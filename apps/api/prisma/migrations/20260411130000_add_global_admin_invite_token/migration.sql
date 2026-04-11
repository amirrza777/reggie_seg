CREATE TABLE `GlobalAdminInviteToken` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `invitedByUserId` INTEGER NOT NULL,
  `acceptedByUserId` INTEGER NULL,
  `revoked` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `usedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `GlobalAdminInviteToken_tokenHash_key`(`tokenHash`),
  INDEX `GlobalAdminInviteToken_email_idx`(`email`),
  INDEX `GlobalAdminInviteToken_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GlobalAdminInviteToken`
  ADD CONSTRAINT `GlobalAdminInviteToken_invitedByUserId_fkey`
  FOREIGN KEY (`invitedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `GlobalAdminInviteToken`
  ADD CONSTRAINT `GlobalAdminInviteToken_acceptedByUserId_fkey`
  FOREIGN KEY (`acceptedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
