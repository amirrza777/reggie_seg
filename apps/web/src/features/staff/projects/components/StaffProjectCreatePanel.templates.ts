import type { Questionnaire } from "@/features/questionnaires/types";

type LoadProjectPeerTemplatesArgs = {
  templateId: string;
  getMyQuestionnaires: (options?: { query?: string }) => Promise<Questionnaire[]>;
  isMounted: () => boolean;
  setIsLoadingTemplates: (value: boolean) => void;
  setTemplatesError: (value: string | null) => void;
  setTemplates: (value: Questionnaire[]) => void;
  setSelectedTemplateOption: (value: Questionnaire | null) => void;
};

export async function loadProjectPeerTemplates({
  templateId,
  getMyQuestionnaires,
  isMounted,
  setIsLoadingTemplates,
  setTemplatesError,
  setTemplates,
  setSelectedTemplateOption,
}: LoadProjectPeerTemplatesArgs): Promise<void> {
  setIsLoadingTemplates(true);
  setTemplatesError(null);

  try {
    const result = await getMyQuestionnaires({ query: undefined });
    if (!isMounted()) return;

    const sorted = [...result]
      .filter((template) => template.purpose === "PEER_ASSESSMENT" || template.purpose === "GENERAL_PURPOSE")
      .sort((a, b) => a.templateName.localeCompare(b.templateName));

    setTemplates(sorted);
    if (templateId.trim().length > 0) {
      const selected = sorted.find((template) => String(template.id) === templateId) ?? null;
      if (selected) {
        setSelectedTemplateOption(selected);
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
