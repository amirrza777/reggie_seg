-- Add role enum column and backfill from legacy booleans
ALTER TABLE `User`
  ADD COLUMN `role` ENUM('STUDENT', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'STUDENT';

UPDATE `User`
SET `role` = CASE
  WHEN `isAdmin` = true THEN 'ADMIN'
  WHEN `isStaff` = true THEN 'STAFF'
  ELSE 'STUDENT'
END;

ALTER TABLE `User`
  DROP COLUMN `isAdmin`,
  DROP COLUMN `isStaff`;
