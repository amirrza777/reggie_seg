-- Allow duplicate team names across different projects in the same enterprise.
DROP INDEX `Team_enterpriseId_teamName_key` ON `Team`;
