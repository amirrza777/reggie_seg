CREATE TABLE `FeatureFlag` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `enterpriseId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `FeatureFlag_enterpriseId_key_key`(`enterpriseId`, `key`),
  INDEX `FeatureFlag_enterpriseId_idx`(`enterpriseId`),
  CONSTRAINT `FeatureFlag_enterpriseId_fkey` FOREIGN KEY (`enterpriseId`) REFERENCES `Enterprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
