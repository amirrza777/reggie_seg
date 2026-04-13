import {
  AboutSection,
  CtaSection,
  FaqSection,
  HealthSection,
  HeroSection,
  IntegrationsSection,
  ProductSection,
  ShowcaseSection,
  TestimonialsSection,
  ToolkitSection,
  TrustSection,
} from "@/marketing/sections";
import { MarketingLayout } from "@/marketing/layouts/marketing";
import "./styles/global-marketing.css";

export default function HomePage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <ProductSection />
      <ShowcaseSection />
      <TrustSection />
      <ToolkitSection />
      <AboutSection />
      <IntegrationsSection />
      <HealthSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </MarketingLayout>
  );
}
