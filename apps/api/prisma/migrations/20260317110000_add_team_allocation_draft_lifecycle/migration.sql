-- AlterTable
ALTER TABLE `Team`
  ADD COLUMN `allocationLifecycle` ENUM('DRAFT', 'ACTIVE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `draftCreatedById` INTEGER NULL,
  ADD COLUMN `draftApprovedById` INTEGER NULL,
  ADD COLUMN `draftApprovedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Team_allocationLifecycle_idx` ON `Team`(`allocationLifecycle`);

-- CreateIndex
CREATE INDEX `Team_draftCreatedById_idx` ON `Team`(`draftCreatedById`);

-- CreateIndex
CREATE INDEX `Team_draftApprovedById_idx` ON `Team`(`draftApprovedById`);

-- AddForeignKey
ALTER TABLE `Team`
  ADD CONSTRAINT `Team_draftCreatedById_fkey`
  FOREIGN KEY (`draftCreatedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team`
  ADD CONSTRAINT `Team_draftApprovedById_fkey`
  FOREIGN KEY (`draftApprovedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
