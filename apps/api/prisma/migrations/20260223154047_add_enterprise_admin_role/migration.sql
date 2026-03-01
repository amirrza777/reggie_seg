-- DropIndex
DROP INDEX `Module_name_key` ON `Module`;

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('STUDENT', 'STAFF', 'ENTERPRISE_ADMIN', 'ADMIN') NOT NULL DEFAULT 'STUDENT';
