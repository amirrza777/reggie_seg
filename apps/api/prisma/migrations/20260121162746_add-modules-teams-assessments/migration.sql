-- CreateTable
CREATE TABLE `questionnaireTemplate` (
    `id` INTEGER NOT NULL,
    `templateName` VARCHAR(191) NOT NULL,
    `questionText` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `questionnaireTemplate_id_idx`(`id`),
    PRIMARY KEY (`id`, `questionText`(191))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserModule` (
    `userId` INTEGER NOT NULL,
    `moduleId` INTEGER NOT NULL,

    PRIMARY KEY (`userId`, `moduleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamAllocation` (
    `teamId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`teamId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Team_teamName_key` ON `Team`(`teamName`);

-- AddForeignKey
ALTER TABLE `ModuleLead` ADD CONSTRAINT `ModuleLead_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModuleLead` ADD CONSTRAINT `ModuleLead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserModule` ADD CONSTRAINT `UserModule_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserModule` ADD CONSTRAINT `UserModule_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamAllocation` ADD CONSTRAINT `TeamAllocation_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamAllocation` ADD CONSTRAINT `TeamAllocation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
