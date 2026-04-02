import {
  QUESTIONNAIRE_PURPOSE_VALUES,
  type QuestionnairePurpose,
} from "./types";

export const DEFAULT_QUESTIONNAIRE_PURPOSE: QuestionnairePurpose = "GENERAL_PURPOSE";

export const QUESTIONNAIRE_PURPOSE_LABELS: Record<QuestionnairePurpose, string> = {
  PEER_ASSESSMENT: "Peer Assessment",
  CUSTOMISED_ALLOCATION: "Customised Allocation",
  GENERAL_PURPOSE: "General Purpose",
};

export const QUESTIONNAIRE_PURPOSE_OPTIONS = QUESTIONNAIRE_PURPOSE_VALUES.map((purpose) => ({
  purpose,
  label: QUESTIONNAIRE_PURPOSE_LABELS[purpose],
}));

export function normalizeQuestionnairePurpose(raw: unknown): QuestionnairePurpose {
  if (typeof raw !== "string") {
    return DEFAULT_QUESTIONNAIRE_PURPOSE;
  }

  const normalized = raw.trim().toUpperCase();
  if (normalized === "CUSTOMISED_ALLOCATION") {
    return "CUSTOMISED_ALLOCATION";
  }
  if (normalized === "PEER_ASSESSMENT") {
    return "PEER_ASSESSMENT";
  }
  if (normalized === "GENERAL_PURPOSE") {
    return "GENERAL_PURPOSE";
  }

  return DEFAULT_QUESTIONNAIRE_PURPOSE;
}