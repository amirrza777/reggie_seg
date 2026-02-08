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
} from "./sections/marketing";
import { MarketingLayout } from "./layouts/marketing";

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
