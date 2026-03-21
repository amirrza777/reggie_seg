/*
  Warnings:

  - Added the required column `postCreatedAt` to the `ForumReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postUpdatedAt` to the `ForumReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ForumReport` ADD COLUMN `postCreatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `postUpdatedAt` DATETIME(3) NOT NULL;
