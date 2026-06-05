import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PremiumArticlePage } from "@/components/blog/premium-article-page";
import {
  articleDescription,
  buildTableOfContents,
  contentWithHeadingIds,
  stripHtml,
} from "@/components/blog/blog-utils";
import { SchemaMarkup } from "@/components/schema-markup";
import { fetchPostBySlug, fetchPublishedPosts } from "@/services/api";
import { siteConfig } from "@/lib/site";

interface Props {
  params: Promise<{ slug: string }>;
}

function absoluteUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return `${siteConfig.url}/og-image.svg`;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteConfig.url}${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchPostBySlug(slug);
    const title = post.seoTitle || post.title;
    const description = post.seoDescription || articleDescription(post);
    const ogImage = absoluteUrl(post.ogImageUrl || post.featuredImageUrl);
    return {
      title,
      description,
      keywords: post.seoKeywords || undefined,
      alternates: {
        canonical: post.canonicalUrl || `${siteConfig.url}/blog/${slug}`,
      },
      openGraph: {
        title,
        description,
        type: "article",
        publishedTime: post.publishedAt ?? undefined,
        modifiedTime: post.updatedAt,
        authors: [post.author],
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await fetchPostBySlug(slug);
  } catch {
    notFound();
  }

  let related: Awaited<ReturnType<typeof fetchPublishedPosts>>["posts"] = [];
  try {
    const rel = await fetchPublishedPosts({ category: post.category ?? undefined, page: 1 });
    related = rel.posts.filter((item) => item.slug !== slug).slice(0, 6);
  } catch {
    related = [];
  }

  const toc = buildTableOfContents(post.content);
  const content = contentWithHeadingIds(post.content, toc);
  const postUrl = `${siteConfig.url}/blog/${slug}`;
  const description = articleDescription(post);
  const image = absoluteUrl(post.ogImageUrl || post.featuredImageUrl);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description,
        image,
        url: postUrl,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { "@id": `${postUrl}#author` },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
        },
        mainEntityOfPage: postUrl,
        articleBody: stripHtml(post.content),
      },
      {
        "@id": `${postUrl}#author`,
        "@type": "Person",
        name: post.author,
        url: `${siteConfig.url}/blog`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteConfig.url}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <>
      <SchemaMarkup data={schema} />
      <PremiumArticlePage post={post} related={related} toc={toc} content={content} postUrl={postUrl} />
    </>
  );
}
