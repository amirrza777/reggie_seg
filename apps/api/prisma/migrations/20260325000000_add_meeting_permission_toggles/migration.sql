-- AlterTable
ALTER TABLE `Module` ADD COLUMN `allowAnyoneToEditMeetings` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `allowAnyoneToRecordAttendance` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `allowAnyoneToWriteMinutes` BOOLEAN NOT NULL DEFAULT false;
