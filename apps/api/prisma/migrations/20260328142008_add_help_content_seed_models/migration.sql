-- CreateTable
CREATE TABLE `HelpTopic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(64) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HelpTopic_slug_key`(`slug`),
    INDEX `HelpTopic_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HelpArticle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topicId` INTEGER NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `summary` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `audience` VARCHAR(32) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HelpArticle_slug_key`(`slug`),
    INDEX `HelpArticle_topicId_sortOrder_idx`(`topicId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HelpFaqGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topicId` INTEGER NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` VARCHAR(255) NULL,
    `audience` VARCHAR(32) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HelpFaqGroup_slug_key`(`slug`),
    INDEX `HelpFaqGroup_topicId_sortOrder_idx`(`topicId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HelpFaq` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `question` VARCHAR(255) NOT NULL,
    `answer` TEXT NOT NULL,
    `links` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HelpFaq_slug_key`(`slug`),
    INDEX `HelpFaq_groupId_sortOrder_idx`(`groupId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HelpArticle` ADD CONSTRAINT `HelpArticle_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `HelpTopic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HelpFaqGroup` ADD CONSTRAINT `HelpFaqGroup_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `HelpTopic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HelpFaq` ADD CONSTRAINT `HelpFaq_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `HelpFaqGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
