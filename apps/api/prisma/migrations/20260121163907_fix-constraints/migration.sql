-- AlterTable
ALTER TABLE `questionnaireTemplate` DROP PRIMARY KEY,
    ADD COLUMN `questionHash` CHAR(64) NOT NULL,
    ADD COLUMN `questionId` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`questionId`);

-- CreateIndex
CREATE UNIQUE INDEX `questionnaireTemplate_id_questionHash_key` ON `questionnaireTemplate`(`id`, `questionHash`);

-- RenameIndex
ALTER TABLE `TeamAllocation` RENAME INDEX `TeamAllocation_userId_fkey` TO `TeamAllocation_userId_idx`;

-- RenameIndex
ALTER TABLE `UserModule` RENAME INDEX `UserModule_moduleId_fkey` TO `UserModule_moduleId_idx`;
