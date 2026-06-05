import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Eye, Tag, User } from "lucide-react";

import { fetchPostBySlug, fetchPublishedPosts } from "@/services/api";
import { AdsenseSlot } from "@/components/adsense-slot";
import { SchemaMarkup } from "@/components/schema-markup";
import { ShareButtons } from "@/components/share-buttons";
import { siteConfig } from "@/lib/site";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Strip HTML tags and estimate reading time (200 wpm). */
function readingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchPostBySlug(slug);
    const title = post.seoTitle || post.title;
    const description =
      post.seoDescription || post.excerpt || post.content.replace(/<[^>]+>/g, " ").slice(0, 160);
    const ogImage = post.ogImageUrl || `${siteConfig.url}/og-image.svg`;
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

  // Related posts — same category, excluding current (best-effort)
  let related: Awaited<ReturnType<typeof fetchPublishedPosts>>["posts"] = [];
  try {
    const rel = await fetchPublishedPosts({ category: post.category ?? undefined, page: 1 });
    related = rel.posts.filter((p) => p.slug !== slug).slice(0, 3);
  } catch {
    // non-fatal
  }

  const mins = readingTime(post.content);
  const postUrl = `${siteConfig.url}/blog/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.seoDescription,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: post.ogImageUrl || `${siteConfig.url}/og-image.svg`,
    url: postUrl,
  };

  return (
    <div className="container-shell py-10 md:py-14">
      <SchemaMarkup data={articleSchema} />

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-foreground transition">Blog</Link>
        {post.category && (
          <>
            <span>/</span>
            <Link
              href={`/blog?category=${encodeURIComponent(post.category)}` as `/blog${string}`}
              className="hover:text-foreground transition"
            >
              {post.category}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate max-w-[200px] text-foreground">{post.title}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_280px]">
        {/* ── Main article column ── */}
        <article>
          {/* Category + meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {post.category && (
              <Link
                href={`/blog?category=${encodeURIComponent(post.category)}` as `/blog${string}`}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary transition hover:bg-primary/20"
              >
                <Tag className="h-3 w-3" />
                {post.category}
              </Link>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {post.author}
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {mins} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.viewCount.toLocaleString()} views
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt / subtitle */}
          {post.excerpt && (
            <p className="mt-5 text-xl leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          {/* Featured image */}
          {post.featuredImageUrl && (
            <div className="mt-8 overflow-hidden rounded-2xl border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featuredImageUrl}
                alt={post.title}
                loading="eager"
                className="w-full object-cover"
              />
            </div>
          )}

          {/* ── Ad slot — after header, before content ── */}
          <div className="mt-8">
            <AdsenseSlot label="Article — Top" />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?q=${encodeURIComponent(tag)}` as `/blog${string}`}
                  className="rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Article body */}
          <div
            className="
              prose prose-sm mt-10 max-w-none text-foreground/90
              [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight
              [&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:text-xl [&_h3]:font-semibold
              [&_p]:mb-5 [&_p]:leading-[1.8] [&_p]:text-muted-foreground
              [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_li]:text-muted-foreground
              [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6
              [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
              [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono
              [&_pre]:my-6 [&_pre]:overflow-auto [&_pre]:rounded-2xl [&_pre]:bg-muted [&_pre]:p-5
              [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline
              [&_img]:rounded-2xl [&_img]:border [&_img]:shadow-sm
              [&_strong]:font-bold [&_strong]:text-foreground
              [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:font-bold
            "
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* ── Ad slot — mid-article ── */}
          <div className="my-10">
            <AdsenseSlot label="Article — Mid Content" />
          </div>

          {/* Divider */}
          <hr className="border-border/50" />

          {/* Share buttons */}
          <ShareButtons
            url={postUrl}
            title={post.title}
            label="Share this article"
            className="mt-8"
          />

          {/* Footer nav */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-semibold text-primary transition hover:underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Updated{" "}
              {new Date(post.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </article>

        {/* ── Sidebar ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {/* Author card */}
            <div className="card-surface p-5">
              <p className="section-label mb-3">Author</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {post.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{siteConfig.name} Team</p>
                </div>
              </div>
            </div>

            {/* Sidebar ad */}
            <AdsenseSlot label="Article — Sidebar" orientation="vertical" />

            {/* Tags sidebar */}
            {post.tags.length > 0 && (
              <div className="card-surface p-5">
                <p className="section-label mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?q=${encodeURIComponent(tag)}` as `/blog${string}`}
                      className="rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Related posts ── */}
      {related.length > 0 && (
        <section className="mt-16 border-t pt-12">
          <p className="section-label">Related Articles</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rp) => (
              <Link
                key={rp.id}
                href={`/blog/${rp.slug}` as `/blog/${string}`}
                className="group card-surface flex flex-col gap-3 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
              >
                {rp.featuredImageUrl && (
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rp.featuredImageUrl}
                      alt={rp.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 p-4">
                  {rp.category && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {rp.category}
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug transition group-hover:text-primary">
                    {rp.title}
                  </h3>
                  {rp.excerpt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {rp.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Bottom ad ── */}
      <div className="mt-12">
        <AdsenseSlot label="Article — Bottom" />
      </div>
    </div>
  );
}
