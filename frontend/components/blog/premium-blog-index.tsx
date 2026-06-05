"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Eye,
  Heart,
  Mail,
  Search,
  Sparkles,
} from "lucide-react";

import type { BlogPostSummary } from "@/services/api";
import {
  categoryCounts,
  collectPopularTags,
  estimateReadingTime,
  initials,
  postDate,
  stableMetric,
} from "@/components/blog/blog-utils";

interface PremiumBlogIndexProps {
  posts: BlogPostSummary[];
  gridPosts: BlogPostSummary[];
  featuredPost: BlogPostSummary | null;
  categories: string[];
  page: number;
  totalPages: number;
  total: number;
  category?: string;
  q?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

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

export function PremiumBlogIndex({
  posts,
  gridPosts,
  featuredPost,
  categories,
  page,
  totalPages,
  total,
  category,
  q,
}: PremiumBlogIndexProps) {
  const ctx = { page, category, q };
  const tags = collectPopularTags(posts);
  const categoryData = categoryCounts(posts, categories);

  return (
    <main className="overflow-hidden">
      <section className="relative border-b bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_30%),radial-gradient(circle_at_80%_10%,hsl(var(--secondary)/0.14),transparent_26%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <motion.div
          aria-hidden
          className="absolute left-8 top-20 hidden h-24 w-24 rounded-[2rem] border bg-card/50 shadow-soft backdrop-blur md:block"
          animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute right-12 top-32 hidden h-20 w-36 rounded-[2rem] border bg-card/50 shadow-soft backdrop-blur lg:block"
          animate={{ y: [0, 14, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="container-shell relative py-16 md:py-24"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              ClipFetch Journal
            </span>
            <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
              Ideas for faster, cleaner video workflows
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Practical guides, product updates, and platform playbooks written for creators,
              operators, and teams who care about speed and clarity.
            </p>
          </motion.div>

          <motion.form
            variants={fadeUp}
            method="GET"
            action="/blog"
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-[2rem] border bg-card/80 p-2 shadow-soft backdrop-blur sm:flex-row"
          >
            {category && <input type="hidden" name="category" value={category} />}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search guides, tags, and platform tips"
                className="h-12 w-full rounded-[1.5rem] bg-transparent pl-11 pr-4 text-sm outline-none"
              />
            </div>
            <button className="h-12 rounded-[1.5rem] bg-foreground px-6 text-sm font-bold text-background shadow-glow transition hover:scale-[1.02]">
              Search
            </button>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap justify-center gap-2">
            <Link href="/blog" className={chipClass(!category)}>
              All
            </Link>
            {categories.slice(0, 8).map((cat) => (
              <Link key={cat} href={buildHref(ctx, { category: cat, page: 1 })} className={chipClass(category === cat)}>
                {cat}
              </Link>
            ))}
          </motion.div>

          {tags.length > 0 && (
            <motion.div variants={fadeUp} className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {tags.map((tag) => (
                <Link key={tag} href={buildHref(ctx, { q: tag, page: 1 })} className="rounded-full border bg-background/50 px-3 py-1 transition hover:border-primary/40 hover:text-primary">
                  #{tag}
                </Link>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      <div className="container-shell py-12 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Featured</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Editor&apos;s pick</h2>
          </div>
          <p className="text-sm text-muted-foreground">{total} published articles</p>
        </div>

        {featuredPost ? <FeaturedArticle post={featuredPost} /> : <EmptyState />}

        <section className="mt-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">Trending</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Latest intelligence</h2>
            </div>
            {q || category ? (
              <Link href="/blog" className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-primary/50 hover:text-primary">
                Clear filters
              </Link>
            ) : null}
          </div>

          {gridPosts.length > 0 ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {gridPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </motion.div>
          ) : featuredPost ? null : (
            <EmptyState />
          )}
        </section>

        {categoryData.length > 0 && (
          <section className="mt-16">
            <div className="mb-6">
              <p className="section-label">Categories</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Browse by focus</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryData.map((item) => (
                <Link
                  key={item.name}
                  href={buildHref(ctx, { category: item.name, page: 1 })}
                  className="group rounded-[1.5rem] border bg-card/80 p-[1px] shadow-soft transition hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-primary/45 hover:to-secondary/45"
                >
                  <div className="flex items-center justify-between rounded-[1.45rem] bg-card px-5 py-4">
                    <span className="font-bold">{item.name}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {item.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Newsletter />
        <Pagination page={page} totalPages={totalPages} ctx={ctx} />
      </div>
    </main>
  );
}

function chipClass(active: boolean): string {
  return `rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition ${
    active
      ? "bg-foreground text-background shadow-glow"
      : "border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
  }`;
}

function FeaturedArticle({ post }: { post: BlogPostSummary }) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="group overflow-hidden rounded-[2rem] border bg-card shadow-soft md:grid md:grid-cols-[1.08fr_0.92fr]"
    >
      <Link href={`/blog/${post.slug}` as `/blog/${string}`} className="relative block min-h-72 overflow-hidden md:min-h-[430px]">
        {post.featuredImageUrl ? (
          <Image
            src={post.featuredImageUrl}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 54vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-card to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-950">
          {post.category ?? "Guide"}
        </span>
      </Link>
      <div className="flex flex-col justify-center p-7 md:p-10">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{postDate(post)}</span>
          <span>{estimateReadingTime(post.excerpt)} min read</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{stableMetric(post.id, 1200, 9800).toLocaleString()}</span>
        </div>
        <Link href={`/blog/${post.slug}` as `/blog/${string}`}>
          <h3 className="mt-5 text-3xl font-black leading-tight tracking-tight transition group-hover:text-primary md:text-5xl">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && <p className="mt-5 text-base leading-8 text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <AuthorPill post={post} />
          <Link href={`/blog/${post.slug}` as `/blog/${string}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:translate-x-0.5">
            Read feature <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function BlogCard({ post }: { post: BlogPostSummary }) {
  const likes = stableMetric(`${post.id}-likes`, 24, 420);
  const views = stableMetric(post.id, 480, 7800);

  return (
    <motion.article variants={fadeUp}>
      <Link
        href={`/blog/${post.slug}` as `/blog/${string}`}
        className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          {post.featuredImageUrl ? (
            <Image
              src={post.featuredImageUrl}
              alt={post.title}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/15 via-muted to-secondary/15" />
          )}
          <div className="absolute inset-x-4 bottom-4 h-1 overflow-hidden rounded-full bg-white/30">
            <span className="block h-full w-2/3 rounded-full bg-white/90 transition group-hover:w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
            {post.category && <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{post.category}</span>}
            <span className="text-muted-foreground">{estimateReadingTime(post.excerpt)} min</span>
          </div>
          <h3 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-tight transition group-hover:text-primary">
            {post.title}
          </h3>
          {post.excerpt && <p className="mt-3 line-clamp-3 flex-1 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>}
          <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <AuthorPill post={post} compact />
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{views.toLocaleString()}</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{likes}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function AuthorPill({ post, compact = false }: { post: BlogPostSummary; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`${compact ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs"} flex items-center justify-center rounded-full bg-foreground font-black text-background`}>
        {initials(post.author)}
      </span>
      {!compact && <span className="text-sm font-bold">{post.author}</span>}
      {compact && <span>{post.author}</span>}
    </span>
  );
}

function Newsletter() {
  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] border bg-card/70 p-6 shadow-soft backdrop-blur md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_80%_80%,hsl(var(--secondary)/0.16),transparent_28%)]" />
      <div className="relative grid gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <p className="section-label">Newsletter</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Get the next practical guide first</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            A concise digest of platform changes, creator workflows, and product improvements.
          </p>
        </div>
        <form className="flex flex-col gap-3 rounded-[1.5rem] border bg-background/70 p-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="email" placeholder="you@example.com" className="h-12 w-full bg-transparent pl-11 pr-3 text-sm outline-none" />
          </div>
          <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-[1.2rem] bg-foreground px-5 text-sm font-bold text-background transition hover:scale-[1.02]">
            Subscribe <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Pagination({ page, totalPages, ctx }: { page: number; totalPages: number; ctx: { page: number; category?: string; q?: string } }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Blog pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link href={buildHref(ctx, { page: page - 1 })} className="rounded-full border px-5 py-2.5 text-sm font-bold transition hover:border-primary/40">Previous</Link>}
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={buildHref(ctx, { page: n })} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition ${n === page ? "bg-foreground text-background" : "border bg-card hover:border-primary/40"}`}>
          {n}
        </Link>
      ))}
      {page < totalPages && <Link href={buildHref(ctx, { page: page + 1 })} className="rounded-full border px-5 py-2.5 text-sm font-bold transition hover:border-primary/40">Next</Link>}
    </nav>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border bg-card p-14 text-center shadow-soft">
      <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
      <p className="mt-4 text-lg font-bold text-muted-foreground">No posts found.</p>
    </div>
  );
}
