-- CreateTable
CREATE TABLE `GithubAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `githubUserId` BIGINT NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `accessTokenEncrypted` VARCHAR(191) NOT NULL,
    `refreshTokenEncrypted` VARCHAR(191) NULL,
    `tokenType` VARCHAR(191) NULL,
    `scopes` VARCHAR(191) NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `tokenLastRefreshedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GithubAccount_userId_key`(`userId`),
    UNIQUE INDEX `GithubAccount_githubUserId_key`(`githubUserId`),
    INDEX `GithubAccount_login_idx`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GithubRepoSnapshot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectGithubRepositoryId` INTEGER NOT NULL,
    `analysedByUserId` INTEGER NULL,
    `analysedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GithubRepoSnapshot_projectGithubRepositoryId_idx`(`projectGithubRepositoryId`),
    INDEX `GithubRepoSnapshot_analysedAt_idx`(`analysedAt`),
    INDEX `GithubRepoSnapshot_analysedByUserId_idx`(`analysedByUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GithubRepoSnapshotRepoStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `snapshotId` INTEGER NOT NULL,
    `totalCommits` INTEGER NOT NULL DEFAULT 0,
    `totalAdditions` INTEGER NOT NULL DEFAULT 0,
    `totalDeletions` INTEGER NOT NULL DEFAULT 0,
    `totalContributors` INTEGER NOT NULL DEFAULT 0,
    `matchedContributors` INTEGER NOT NULL DEFAULT 0,
    `unmatchedContributors` INTEGER NOT NULL DEFAULT 0,
    `unmatchedCommits` INTEGER NOT NULL DEFAULT 0,
    `defaultBranchCommits` INTEGER NOT NULL DEFAULT 0,
    `commitsByDay` JSON NULL,
    `commitsByBranch` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GithubRepoSnapshotRepoStat_snapshotId_idx`(`snapshotId`),
    UNIQUE INDEX `GithubRepoSnapshotRepoStat_snapshotId_key`(`snapshotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GithubRepoSnapshotUserStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `snapshotId` INTEGER NOT NULL,
    `mappedUserId` INTEGER NULL,
    `contributorKey` VARCHAR(191) NOT NULL,
    `githubUserId` BIGINT NULL,
    `githubLogin` VARCHAR(191) NULL,
    `authorEmail` VARCHAR(191) NULL,
    `isMatched` BOOLEAN NOT NULL DEFAULT false,
    `commits` INTEGER NOT NULL DEFAULT 0,
    `additions` INTEGER NOT NULL DEFAULT 0,
    `deletions` INTEGER NOT NULL DEFAULT 0,
    `commitsByDay` JSON NULL,
    `commitsByBranch` JSON NULL,
    `firstCommitAt` DATETIME(3) NULL,
    `lastCommitAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GithubRepoSnapshotUserStat_snapshotId_idx`(`snapshotId`),
    INDEX `GithubRepoSnapshotUserStat_mappedUserId_idx`(`mappedUserId`),
    INDEX `GithubRepoSnapshotUserStat_githubLogin_idx`(`githubLogin`),
    UNIQUE INDEX `GithubRepoSnapshotUserStat_snapshotId_contributorKey_key`(`snapshotId`, `contributorKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GithubRepository` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `githubRepoId` BIGINT NOT NULL,
    `ownerLogin` VARCHAR(191) NOT NULL,
    `ownerType` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `htmlUrl` VARCHAR(191) NOT NULL,
    `isPrivate` BOOLEAN NOT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `defaultBranch` VARCHAR(191) NULL,
    `pushedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GithubRepository_githubRepoId_key`(`githubRepoId`),
    UNIQUE INDEX `GithubRepository_fullName_key`(`fullName`),
    INDEX `GithubRepository_ownerLogin_idx`(`ownerLogin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectGithubRepository` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `githubRepositoryId` INTEGER NOT NULL,
    `linkedByUserId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `autoSyncEnabled` BOOLEAN NOT NULL DEFAULT true,
    `syncIntervalMinutes` INTEGER NOT NULL DEFAULT 60,
    `lastSyncedAt` DATETIME(3) NULL,
    `nextSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProjectGithubRepository_projectId_idx`(`projectId`),
    INDEX `ProjectGithubRepository_githubRepositoryId_idx`(`githubRepositoryId`),
    INDEX `ProjectGithubRepository_linkedByUserId_idx`(`linkedByUserId`),
    INDEX `ProjectGithubRepository_nextSyncAt_idx`(`nextSyncAt`),
    UNIQUE INDEX `ProjectGithubRepository_projectId_githubRepositoryId_key`(`projectId`, `githubRepositoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GithubAccount` ADD CONSTRAINT `GithubAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GithubRepoSnapshot` ADD CONSTRAINT `GithubRepoSnapshot_projectGithubRepositoryId_fkey` FOREIGN KEY (`projectGithubRepositoryId`) REFERENCES `ProjectGithubRepository`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GithubRepoSnapshot` ADD CONSTRAINT `GithubRepoSnapshot_analysedByUserId_fkey` FOREIGN KEY (`analysedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GithubRepoSnapshotRepoStat` ADD CONSTRAINT `GithubRepoSnapshotRepoStat_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `GithubRepoSnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GithubRepoSnapshotUserStat` ADD CONSTRAINT `GithubRepoSnapshotUserStat_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `GithubRepoSnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GithubRepoSnapshotUserStat` ADD CONSTRAINT `GithubRepoSnapshotUserStat_mappedUserId_fkey` FOREIGN KEY (`mappedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGithubRepository` ADD CONSTRAINT `ProjectGithubRepository_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGithubRepository` ADD CONSTRAINT `ProjectGithubRepository_githubRepositoryId_fkey` FOREIGN KEY (`githubRepositoryId`) REFERENCES `GithubRepository`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectGithubRepository` ADD CONSTRAINT `ProjectGithubRepository_linkedByUserId_fkey` FOREIGN KEY (`linkedByUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
