-- Drop index if it exists to keep migration idempotent
SET @idx := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'Module'
    AND index_name = 'Module_name_key'
);
SET @drop := IF(@idx > 0, 'DROP INDEX `Module_name_key` ON `Module`;', 'SELECT 1;');
PREPARE stmt FROM @drop;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
