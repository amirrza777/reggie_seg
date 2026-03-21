-- AddColumn
ALTER TABLE `DiscussionPost` ADD COLUMN `parentPostId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `DiscussionPost_parentPostId_idx` ON `DiscussionPost`(`parentPostId`);

-- AddForeignKey
ALTER TABLE `DiscussionPost` ADD CONSTRAINT `DiscussionPost_parentPostId_fkey` FOREIGN KEY (`parentPostId`) REFERENCES `DiscussionPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
