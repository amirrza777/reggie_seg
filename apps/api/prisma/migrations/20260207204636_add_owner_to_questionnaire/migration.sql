/*
  Warnings:

  - Added the required column `ownerId` to the `QuestionnaireTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `QuestionnaireTemplate` ADD COLUMN `ownerId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `QuestionnaireTemplate` ADD CONSTRAINT `QuestionnaireTemplate_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
