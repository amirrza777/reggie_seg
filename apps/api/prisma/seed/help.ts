import { withSeedLogging } from "./logging";
import { helpFaqGroups, helpFaqs } from "./help/faqs";
import { helpArticles, helpTopics } from "./help/topics-and-articles";
import { upsertHelpArticles, upsertHelpFaqGroups, upsertHelpFaqs, upsertHelpTopics } from "./help/writes";

export async function seedHelpContent() {
  return withSeedLogging("seedHelpContent", async () => {
    const topicIds = await upsertHelpTopics(helpTopics);
    await upsertHelpArticles(helpArticles, topicIds);
    const groupIds = await upsertHelpFaqGroups(helpFaqGroups, topicIds);
    await upsertHelpFaqs(helpFaqs, groupIds);

    return {
      value: undefined,
      rows: helpTopics.length + helpArticles.length + helpFaqGroups.length + helpFaqs.length,
      details: `topics=${helpTopics.length}; articles=${helpArticles.length}; faq groups=${helpFaqGroups.length}; faqs=${helpFaqs.length}`,
    };
  });
}
