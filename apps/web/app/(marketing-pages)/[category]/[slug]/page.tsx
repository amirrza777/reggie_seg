import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterLinkDescriptionPage } from "@/shared/marketing/FooterLinkDescriptionPage";
import { getFooterLinkPage, listFooterLinkParams, type FooterLinkCategory } from "@/shared/marketing/footerLinkPages";

type FooterDetailPageProps = {
  params: Promise<{ category: string; slug: string }>;
};

const validCategory = (value: string): value is FooterLinkCategory =>
  value === "product" || value === "resources" || value === "integrations";

export function generateStaticParams() {
  return listFooterLinkParams();
}

export async function generateMetadata({ params }: FooterDetailPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  if (!validCategory(category)) return {};
  const page = getFooterLinkPage(category, slug);
  if (!page) return {};

  return {
    title: `${page.label} — Team Feedback`,
    description: page.description,
  };
}

export default async function FooterDetailPage({ params }: FooterDetailPageProps) {
  const { category, slug } = await params;
  if (!validCategory(category)) notFound();

  const page = getFooterLinkPage(category, slug);
  if (!page) notFound();

  return <FooterLinkDescriptionPage category={category} page={page} />;
}
