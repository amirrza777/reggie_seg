import type { Metadata } from "next";
import { MarketingOverviewPage } from "@/shared/marketing/MarketingOverviewPage";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";

const page = getMarketingOverviewPage("features");

export const metadata: Metadata = {
  title: "Features — Team Feedback",
  description: page.description,
};

export default function FeaturesOverviewPage() {
  return <MarketingOverviewPage page={page} />;
}
