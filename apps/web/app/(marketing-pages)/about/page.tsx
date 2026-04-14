import type { Metadata } from "next";
import { MarketingOverviewPage } from "@/shared/marketing/MarketingOverviewPage";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";

const page = getMarketingOverviewPage("about");

export const metadata: Metadata = {
  title: "About — Team Feedback",
  description: page.description,
};

export default function AboutOverviewPage() {
  return <MarketingOverviewPage page={page} />;
}
