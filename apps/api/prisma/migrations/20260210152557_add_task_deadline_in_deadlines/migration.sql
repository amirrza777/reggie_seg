/*
  Warnings:

  - Added the required column `taskDueDate` to the `ProjectDeadline` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taskOpenDate` to the `ProjectDeadline` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProjectDeadline` ADD COLUMN `taskDueDate` DATETIME(3) NOT NULL,
    ADD COLUMN `taskOpenDate` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `TeamDeadlineOverride` ADD COLUMN `taskDueDate` DATETIME(3) NULL,
    ADD COLUMN `taskOpenDate` DATETIME(3) NULL;
