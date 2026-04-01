-- AddColumn
ALTER TABLE `Project` ADD COLUMN `teamAllocationQuestionnaireTemplateId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Project_teamAllocationQuestionnaireTemplateId_idx` ON `Project`(`teamAllocationQuestionnaireTemplateId`);

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_teamAllocationQuestionnaireTemplateId_fkey` FOREIGN KEY (`teamAllocationQuestionnaireTemplateId`) REFERENCES `QuestionnaireTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
