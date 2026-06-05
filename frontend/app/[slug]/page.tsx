import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdsenseSlot } from "@/components/adsense-slot";
import { HeroDownloader } from "@/components/hero-downloader";
import { SchemaMarkup } from "@/components/schema-markup";
import { platformPages } from "@/lib/site";

export async function generateStaticParams() {
  return platformPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = platformPages.find((item) => item.slug === slug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description
    }
  };
}

export default async function PlatformLandingPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = platformPages.find((item) => item.slug === slug);

  if (!page) {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description
  };

  return (
    <div className="container-shell py-10">
      <SchemaMarkup data={articleSchema} />
      <div className="grid gap-8 xl:grid-cols-[1fr,300px]">
        <div>
          <section className="card-surface p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {page.platform}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              {page.description} This landing page is optimized for search intent,
              rich metadata, strong internal linking, and conversion-focused UX.
            </p>
          </section>
          <div className="mt-8">
            <HeroDownloader />
          </div>
        </div>
        <div className="space-y-6">
          <AdsenseSlot label={`${page.platform} sidebar banner`} />
          <AdsenseSlot label={`${page.platform} article slot`} orientation="vertical" />
        </div>
      </div>
    </div>
  );
}

