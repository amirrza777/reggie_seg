import type { Metadata } from "next";
import { MarketingOverviewPage } from "@/shared/marketing/MarketingOverviewPage";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";

const page = getMarketingOverviewPage("resources");

export const metadata: Metadata = {
  title: "Resources — Team Feedback",
  description: page.description,
};

export default function ResourcesOverviewPage() {
  return <MarketingOverviewPage page={page} />;
}
