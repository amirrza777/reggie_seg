import type { Questionnaire, QuestionnairePurpose } from "@/features/questionnaires/types";

type LoadProjectPeerTemplatesArgs = {
  templateId: string;
  getMyQuestionnaires: (options?: { query?: string; purpose?: QuestionnairePurpose }) => Promise<Questionnaire[]>;
  isMounted: () => boolean;
  setIsLoadingTemplates: (value: boolean) => void;
  setTemplatesError: (value: string | null) => void;
  setTemplates: (value: Questionnaire[]) => void;
  setSelectedTemplateOption: (value: Questionnaire | null) => void;
  setTemplateId?: (value: string) => void;  // when current template id is not a peer-assessment template, clear it

};

export async function loadProjectPeerTemplates({
  templateId,
  getMyQuestionnaires,
  isMounted,
  setIsLoadingTemplates,
  setTemplatesError,
  setTemplates,
  setSelectedTemplateOption,
  setTemplateId,
}: LoadProjectPeerTemplatesArgs): Promise<void> {
  setIsLoadingTemplates(true);
  setTemplatesError(null);

  try {
    const result = await getMyQuestionnaires({ purpose: "PEER_ASSESSMENT" });
    if (!isMounted()) return;

    const sorted = [...result]
      .filter((template) => template.purpose === "PEER_ASSESSMENT")
      .sort((a, b) => a.templateName.localeCompare(b.templateName));

    setTemplates(sorted);
    if (templateId.trim().length > 0) {
      const selected = sorted.find((template) => String(template.id) === templateId) ?? null;
      if (selected) {
        setSelectedTemplateOption(selected);
      } else {
        setSelectedTemplateOption(null);
        setTemplateId?.("");
      }
    }
  } catch (error) {
    if (!isMounted()) return;
    setTemplatesError(error instanceof Error ? error.message : "Failed to load your questionnaires.");
    setTemplates([]);
  } finally {
    if (!isMounted()) return;
    setIsLoadingTemplates(false);
  }
}
