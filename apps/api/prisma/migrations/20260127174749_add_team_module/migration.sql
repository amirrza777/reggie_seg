/*
  Warnings:

  - Added the required column `moduleId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Team` ADD COLUMN `moduleId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Team_moduleId_idx` ON `Team`(`moduleId`);

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
