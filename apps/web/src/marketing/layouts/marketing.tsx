import { Suspense, type ReactNode } from "react";
import { Footer } from "@/shared/layout/Footer";
import { Header } from "@/shared/layout/Header";
import { HomeSectionScroll } from "@/shared/animation/HomeSectionScroll";
import { ScrollReveal } from "@/shared/animation/ScrollReveal";

type MarketingLayoutProps = {
  children: ReactNode;
};

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-shell">
      <Header />
      <Suspense fallback={null}>
        <HomeSectionScroll />
      </Suspense>
      <ScrollReveal />
      <main className="marketing-main">{children}</main>
      <Footer />
    </div>
  );
}
