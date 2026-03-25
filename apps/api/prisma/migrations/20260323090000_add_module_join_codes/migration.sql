ALTER TABLE `Module`
  ADD COLUMN `joinCode` VARCHAR(32) NULL;

UPDATE `Module`
SET `joinCode` = CONCAT('M', LPAD(UPPER(CONV(`id`, 10, 32)), 7, '0'))
WHERE `joinCode` IS NULL;

ALTER TABLE `Module`
  MODIFY `joinCode` VARCHAR(32) NOT NULL;

CREATE UNIQUE INDEX `Module_enterpriseId_joinCode_key` ON `Module`(`enterpriseId`, `joinCode`);
