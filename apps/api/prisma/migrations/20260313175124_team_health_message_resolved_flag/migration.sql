/*
  Warnings:

  - You are about to drop the column `status` on the `MCFRequest` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `MCFRequest_projectId_teamId_status_idx` ON `MCFRequest`;

-- DropIndex
DROP INDEX `MCFRequest_status_createdAt_idx` ON `MCFRequest`;

-- AlterTable
ALTER TABLE `MCFRequest` DROP COLUMN `status`,
    ADD COLUMN `resolved` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `responseText` TEXT NULL;

-- CreateIndex
CREATE INDEX `MCFRequest_resolved_createdAt_idx` ON `MCFRequest`(`resolved`, `createdAt`);

-- CreateIndex
CREATE INDEX `MCFRequest_projectId_teamId_resolved_idx` ON `MCFRequest`(`projectId`, `teamId`, `resolved`);
