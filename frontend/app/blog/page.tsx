import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Search, Tag, User } from "lucide-react";

import { fetchCategories, fetchPublishedPosts } from "@/services/api";
import type { BlogPostSummary } from "@/services/api";
import { AdsenseSlot } from "@/components/adsense-slot";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog — Guides & Video Downloading Tips",
  description:
    "Guides, tips, and platform how-tos from the ClipFetch team. Learn how to download videos from Instagram, TikTok, Facebook, and more.",
  alternates: { canonical: `${siteConfig.url}/blog` },
  openGraph: {
    title: "Blog — Guides & Video Downloading Tips",
    description:
      "Guides, tips, and platform how-tos from the ClipFetch team.",
    url: `${siteConfig.url}/blog`,
    type: "website",
    images: [{ url: `${siteConfig.url}/og-image.svg`, width: 1200, height: 630 }],
  },
};

interface Props {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}

// Cast to `/${string}` (Next.js Route) so typedRoutes accepts it on <Link href>
function buildHref(
  base: { page: number; category?: string; q?: string },
  overrides: { page?: number; category?: string | null; q?: string | null }
): `/${string}` {
  const p = overrides.page ?? base.page;
  const c = overrides.category !== undefined ? overrides.category : base.category;
  const q = overrides.q !== undefined ? overrides.q : base.q;
  const params = new URLSearchParams();
  if (p > 1) params.set("page", String(p));
  if (c) params.set("category", c);
  if (q) params.set("q", q);
  const qs = params.toString();
  return `/blog${qs ? `?${qs}` : ""}` as `/blog${string}`;
}

export default async function BlogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const category = sp.category;
  const q = sp.q;
  const isFiltered = !!(q || category);

  const [postsResult, categoriesResult] = await Promise.allSettled([
    fetchPublishedPosts({ page, category, q }),
    fetchCategories(),
  ]);

  const data =
    postsResult.status === "fulfilled"
      ? postsResult.value
      : { posts: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  const ctx = { page, category, q };
  const featuredPost = !isFiltered && page === 1 && data.posts.length > 0 ? data.posts[0] : null;
  const gridPosts = featuredPost ? data.posts.slice(1) : data.posts;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-transparent">
        <div className="container-shell py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-label">Blog</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
              Guides &amp; Insights
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Tips, how-tos, and platform guides for getting the most out of
              ClipFetch.
            </p>
          </div>

          {/* Search bar */}
          <form
            method="GET"
            action="/blog"
            className="mx-auto mt-8 flex max-w-xl gap-2"
          >
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search posts…"
                className="h-11 w-full rounded-2xl border bg-card/80 pl-10 pr-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Search
            </button>
            {isFiltered && (
              <Link
                href="/blog"
                className="flex h-11 items-center rounded-2xl border px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Clear
              </Link>
            )}
          </form>

          {/* Category chips */}
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link
                href={buildHref(ctx, { category: null, page: 1 })}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  !category
                    ? "bg-primary text-white shadow-sm"
                    : "border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={buildHref(ctx, { category: cat, page: 1 })}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    category === cat
                      ? "bg-primary text-white shadow-sm"
                      : "border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container-shell py-12 md:py-16">
        {/* ── Featured post (page 1, no filters) ── */}
        {featuredPost && (
          <div className="mb-12">
            <Link
              href={`/blog/${featuredPost.slug}` as `/blog/${string}`}
              className="group card-surface block overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-soft md:grid md:grid-cols-[1fr_1fr]"
            >
              {/* Image */}
              <div className="aspect-video overflow-hidden md:aspect-auto md:min-h-72">
                {featuredPost.featuredImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={featuredPost.featuredImageUrl}
                    alt={featuredPost.title}
                    loading="eager"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full min-h-56 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <BookOpen className="h-16 w-16 text-primary/20" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-col justify-center gap-4 p-8 md:p-10">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {featuredPost.category && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">
                      <Tag className="h-3 w-3" />
                      {featuredPost.category}
                    </span>
                  )}
                  {featuredPost.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(featuredPost.publishedAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-extrabold leading-tight tracking-tight transition group-hover:text-primary md:text-3xl">
                  {featuredPost.title}
                </h2>

                {featuredPost.excerpt && (
                  <p className="line-clamp-3 leading-relaxed text-muted-foreground">
                    {featuredPost.excerpt}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
                    Read article{" "}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Ad slot — between featured and grid ── */}
        <div className="mb-10">
          <AdsenseSlot label="Blog — Top Banner" />
        </div>

        {/* ── Post grid ── */}
        {gridPosts.length === 0 && !featuredPost ? (
          <div className="card-surface flex flex-col items-center gap-4 py-24 text-center">
            <BookOpen className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-lg font-semibold text-muted-foreground">
              {isFiltered ? "No posts match your search." : "No posts yet."}
            </p>
            {isFiltered && (
              <Link
                href="/blog"
                className="text-sm text-primary hover:underline underline-offset-4"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* ── Ad slot — below grid ── */}
        {data.posts.length > 3 && (
          <div className="mt-12">
            <AdsenseSlot label="Blog — Below Grid" />
          </div>
        )}

        {/* ── Pagination ── */}
        {data.totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="mt-12 flex items-center justify-center gap-2"
          >
            {page > 1 && (
              <Link
                href={buildHref(ctx, { page: page - 1 })}
                className="rounded-2xl border bg-card/80 px-5 py-2.5 text-sm font-semibold transition hover:border-primary/40"
              >
                ← Previous
              </Link>
            )}

            <div className="flex items-center gap-1">
              {Array.from(
                { length: Math.min(5, data.totalPages) },
                (_, i) => i + 1
              ).map((n) => (
                <Link
                  key={n}
                  href={buildHref(ctx, { page: n })}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                    n === page
                      ? "bg-primary text-white"
                      : "border bg-card/80 hover:border-primary/40"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </div>

            {page < data.totalPages && (
              <Link
                href={buildHref(ctx, { page: page + 1 })}
                className="rounded-2xl border bg-card/80 px-5 py-2.5 text-sm font-semibold transition hover:border-primary/40"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}

function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}` as `/blog/${string}`}
      className="group card-surface flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
    >
      {/* Thumbnail */}
      <div className="aspect-video overflow-hidden">
        {post.featuredImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={post.featuredImageUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <BookOpen className="h-8 w-8 text-primary/20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Category + date row */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em]">
          {post.category && (
            <span className="text-primary">{post.category}</span>
          )}
          {post.category && post.publishedAt && (
            <span className="text-muted-foreground/40">·</span>
          )}
          {post.publishedAt && (
            <span className="text-muted-foreground">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <h2 className="line-clamp-2 text-base font-bold leading-snug transition group-hover:text-primary">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {post.author}
          </span>
          <span className="flex items-center gap-1 font-semibold text-primary">
            Read more{" "}
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
