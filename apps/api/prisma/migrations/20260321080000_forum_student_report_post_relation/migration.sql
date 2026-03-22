-- AddForeignKey
ALTER TABLE `ForumStudentReport` ADD CONSTRAINT `ForumStudentReport_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DiscussionPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
