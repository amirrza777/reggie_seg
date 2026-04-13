import type { ReactNode } from "react";
import { MarketingLayout } from "@/marketing/layouts/marketing";
import "../styles/global-marketing.css";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
