import type { Metadata } from "next";
import { MarketingOverviewPage } from "@/shared/marketing/MarketingOverviewPage";
import { getMarketingOverviewPage } from "@/shared/marketing/marketingOverviewPages";

const page = getMarketingOverviewPage("product");

export const metadata: Metadata = {
  title: "Product — Team Feedback",
  description: page.description,
};

export default function ProductOverviewPage() {
  return <MarketingOverviewPage page={page} />;
}
