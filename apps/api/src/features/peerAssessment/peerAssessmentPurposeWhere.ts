import type { Prisma } from "@prisma/client";
import { QuestionnairePurpose } from "@prisma/client";

/** Rows in `PeerAssessment` that are student peer reviews (excludes team/custom allocation questionnaires). */
export const wherePeerAssessmentIsPeerReview: Prisma.PeerAssessmentWhereInput = {
  questionnaireTemplate: { purpose: QuestionnairePurpose.PEER_ASSESSMENT },
};
