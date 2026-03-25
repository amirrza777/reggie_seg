ALTER TABLE `Module`
    ADD COLUMN `code` VARCHAR(32) NULL;

ALTER TABLE `Module`
    ADD UNIQUE INDEX `Module_enterpriseId_code_key`(`enterpriseId`, `code`);
