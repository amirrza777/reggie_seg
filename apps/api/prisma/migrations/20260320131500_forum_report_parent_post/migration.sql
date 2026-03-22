-- AlterTable
ALTER TABLE `ForumReport` ADD COLUMN `parentPostId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `ForumReport_parentPostId_idx` ON `ForumReport`(`parentPostId`);
