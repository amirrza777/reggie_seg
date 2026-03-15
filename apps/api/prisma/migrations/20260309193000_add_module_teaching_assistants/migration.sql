-- CreateTable
CREATE TABLE `ModuleTeachingAssistant` (
    `moduleId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ModuleTeachingAssistant_userId_fkey`(`userId`),
    PRIMARY KEY (`moduleId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModuleTeachingAssistant` ADD CONSTRAINT `ModuleTeachingAssistant_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModuleTeachingAssistant` ADD CONSTRAINT `ModuleTeachingAssistant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
