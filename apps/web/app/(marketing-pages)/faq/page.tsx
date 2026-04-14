import type { Metadata } from "next";
import { MarketingOverviewPage } from "@/shared/marketing/MarketingOverviewPage";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";

const page = getMarketingOverviewPage("faq");

export const metadata: Metadata = {
  title: "FAQ — Team Feedback",
  description: page.description,
};

export default function FaqOverviewPage() {
  return <MarketingOverviewPage page={page} />;
}
