import type { ReactNode } from "react";
import { Footer } from "@/shared/layout/Footer";
import { Header } from "@/shared/layout/Header";
import { ScrollReveal } from "@/shared/animation/ScrollReveal";

type MarketingLayoutProps = {
  children: ReactNode;
};

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-shell">
      <Header />
      <ScrollReveal />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
