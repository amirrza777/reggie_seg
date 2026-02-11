/*
  Warnings:

  - You are about to drop the `PeerAssessmentReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `PeerAssessmentReview` DROP FOREIGN KEY `PeerAssessmentReview_peerAssessmentId_fkey`;

-- DropTable
DROP TABLE `PeerAssessmentReview`;
