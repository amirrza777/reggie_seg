CREATE TABLE `MeetingParticipant` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `meetingId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `MeetingParticipant_meetingId_userId_key` (`meetingId`, `userId`),
  INDEX `MeetingParticipant_meetingId_idx` (`meetingId`),
  INDEX `MeetingParticipant_userId_idx` (`userId`),
  CONSTRAINT `MeetingParticipant_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `Meeting` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `MeetingParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
