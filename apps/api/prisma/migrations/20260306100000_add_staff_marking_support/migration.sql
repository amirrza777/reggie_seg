-- CreateTable
CREATE TABLE `StaffTeamMarking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `markerUserId` INTEGER NOT NULL,
    `mark` DOUBLE NULL,
    `formativeFeedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffTeamMarking_teamId_key`(`teamId`),
    INDEX `StaffTeamMarking_markerUserId_idx`(`markerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffStudentMarking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `studentUserId` INTEGER NOT NULL,
    `markerUserId` INTEGER NOT NULL,
    `mark` DOUBLE NULL,
    `formativeFeedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffStudentMarking_teamId_studentUserId_key`(`teamId`, `studentUserId`),
    INDEX `StaffStudentMarking_teamId_idx`(`teamId`),
    INDEX `StaffStudentMarking_studentUserId_idx`(`studentUserId`),
    INDEX `StaffStudentMarking_markerUserId_idx`(`markerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StaffTeamMarking` ADD CONSTRAINT `StaffTeamMarking_teamId_fkey`
FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffTeamMarking` ADD CONSTRAINT `StaffTeamMarking_markerUserId_fkey`
FOREIGN KEY (`markerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffStudentMarking` ADD CONSTRAINT `StaffStudentMarking_teamId_fkey`
FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffStudentMarking` ADD CONSTRAINT `StaffStudentMarking_studentUserId_fkey`
FOREIGN KEY (`studentUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffStudentMarking` ADD CONSTRAINT `StaffStudentMarking_markerUserId_fkey`
FOREIGN KEY (`markerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
