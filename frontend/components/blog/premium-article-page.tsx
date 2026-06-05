"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Tag,
} from "lucide-react";

import type { BlogPost, BlogPostSummary } from "@/services/api";
import { ShareButtons } from "@/components/share-buttons";
import {
  articleDescription,
  estimateReadingTime,
  initials,
  postDate,
  stableMetric,
  type TocItem,
} from "@/components/blog/blog-utils";

interface PremiumArticlePageProps {
  post: BlogPost;
  related: BlogPostSummary[];
  toc: TocItem[];
  content: string;
  postUrl: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function PremiumArticlePage({ post, related, toc, content, postUrl }: PremiumArticlePageProps) {
  const { scrollYProgress } = useScroll();
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const mins = estimateReadingTime(post.content);
  const likes = stableMetric(`${post.id}-likes`, 80, 840) + (liked ? 1 : 0);
  const description = articleDescription(post);
  const comments = useMemo(() => buildComments(post.id), [post.id]);

  async function copyLink() {
    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="overflow-hidden">
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-gradient-to-r from-primary via-accent to-secondary"
        style={{ scaleX: scrollYProgress }}
      />

      <section className="relative min-h-[72vh] overflow-hidden border-b">
        {post.featuredImageUrl ? (
          <Image
            src={post.featuredImageUrl}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.24),transparent_30%),radial-gradient(circle_at_80%_20%,hsl(var(--secondary)/0.18),transparent_28%),hsl(var(--background))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />

        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
          className="container-shell relative flex min-h-[72vh] flex-col justify-end pb-12 pt-28 md:pb-16"
        >
          <motion.div variants={fadeUp}>
            <Link href="/blog" className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm font-bold shadow-soft backdrop-blur transition hover:border-primary/40">
              <ArrowLeft className="h-4 w-4" />
              Blog
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {post.category && (
              <Link href={`/blog?category=${encodeURIComponent(post.category)}` as `/blog${string}`} className="rounded-full bg-primary px-3 py-1.5 text-white">
                {post.category}
              </Link>
            )}
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{postDate(post)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{mins} min read</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.viewCount.toLocaleString()} views</span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="mt-5 max-w-5xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            {post.title}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
            {description}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-sm font-black text-background">
                {initials(post.author)}
              </div>
              <div>
                <p className="font-bold">{post.author}</p>
                <p className="text-sm text-muted-foreground">ClipFetch editorial</p>
              </div>
            </div>
            <ArticleActions
              copied={copied}
              liked={liked}
              bookmarked={bookmarked}
              likes={likes}
              onCopy={copyLink}
              onLike={() => setLiked((value) => !value)}
              onBookmark={() => setBookmarked((value) => !value)}
            />
          </motion.div>
        </motion.div>
      </section>

      <section className="container-shell grid gap-8 py-10 lg:grid-cols-[220px_minmax(0,1fr)_240px] lg:py-14">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[1.5rem] border bg-card/80 p-4 shadow-soft backdrop-blur">
            <p className="section-label mb-4">Contents</p>
            <nav className="space-y-2">
              {toc.length > 0 ? (
                toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground ${item.level === 3 ? "ml-3" : ""}`}
                  >
                    {item.title}
                  </a>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Overview</span>
              )}
            </nav>
          </div>
        </aside>

        <article className="min-w-0">
          {toc.length > 0 && (
            <details className="mb-6 rounded-[1.5rem] border bg-card/80 p-4 shadow-soft lg:hidden">
              <summary className="cursor-pointer text-sm font-bold">Table of contents</summary>
              <nav className="mt-3 space-y-2">
                {toc.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="block text-sm text-muted-foreground">
                    {item.title}
                  </a>
                ))}
              </nav>
            </details>
          )}

          <div
            className="
              rounded-[2rem] border bg-card px-5 py-8 shadow-soft md:px-9 md:py-10
              [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:scroll-mt-28 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:tracking-tight
              [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:scroll-mt-28 [&_h3]:text-2xl [&_h3]:font-bold
              [&_p]:mb-6 [&_p]:text-[1.04rem] [&_p]:leading-8 [&_p]:text-muted-foreground
              [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline
              [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:mb-2 [&_li]:leading-8 [&_li]:text-muted-foreground
              [&_blockquote]:my-8 [&_blockquote]:rounded-[1.5rem] [&_blockquote]:border [&_blockquote]:bg-muted/50 [&_blockquote]:p-6 [&_blockquote]:text-lg [&_blockquote]:font-medium
              [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm
              [&_pre]:my-8 [&_pre]:overflow-auto [&_pre]:rounded-[1.5rem] [&_pre]:border [&_pre]:bg-foreground [&_pre]:p-5 [&_pre]:text-background
              [&_img]:my-8 [&_img]:rounded-[1.5rem] [&_img]:border [&_img]:shadow-soft
              [&_table]:my-8 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-4 [&_td]:py-3 [&_th]:border [&_th]:px-4 [&_th]:py-3
            "
            dangerouslySetInnerHTML={{ __html: content }}
          />

          <AuthorSection post={post} />
          <Comments comments={comments} />
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-[1.5rem] border bg-card/80 p-4 shadow-soft backdrop-blur">
              <p className="section-label mb-4">Share</p>
              <ShareButtons url={postUrl} title={post.title} />
            </div>
            <div className="rounded-[1.5rem] border bg-card/80 p-4 shadow-soft backdrop-blur">
              <p className="section-label mb-4">Stats</p>
              <div className="space-y-3 text-sm text-muted-foreground">
                <span className="flex items-center justify-between"><span>Views</span><strong className="text-foreground">{post.viewCount.toLocaleString()}</strong></span>
                <span className="flex items-center justify-between"><span>Likes</span><strong className="text-foreground">{likes}</strong></span>
                <span className="flex items-center justify-between"><span>Reading</span><strong className="text-foreground">{mins} min</strong></span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container-shell border-t py-12">
          <p className="section-label">Related</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Keep reading</h2>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <RelatedCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ArticleActions({
  copied,
  liked,
  bookmarked,
  likes,
  onCopy,
  onLike,
  onBookmark,
}: {
  copied: boolean;
  liked: boolean;
  bookmarked: boolean;
  likes: number;
  onCopy: () => void;
  onLike: () => void;
  onBookmark: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={onCopy} className="inline-flex h-11 items-center gap-2 rounded-full border bg-card/80 px-4 text-sm font-bold shadow-soft backdrop-blur transition hover:border-primary/40">
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <button onClick={onLike} className={`inline-flex h-11 items-center gap-2 rounded-full border bg-card/80 px-4 text-sm font-bold shadow-soft backdrop-blur transition hover:border-primary/40 ${liked ? "text-rose-500" : ""}`}>
        <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
        {likes}
      </button>
      <button onClick={onBookmark} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card/80 shadow-soft backdrop-blur transition hover:border-primary/40 ${bookmarked ? "text-primary" : ""}`} aria-label="Bookmark article">
        <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
      </button>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card/80 shadow-soft backdrop-blur">
        <Share2 className="h-4 w-4" />
      </span>
    </div>
  );
}

function AuthorSection({ post }: { post: BlogPost }) {
  return (
    <section className="mt-8 rounded-[2rem] border bg-card/80 p-6 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-foreground text-lg font-black text-background">
          {initials(post.author)}
        </div>
        <div className="flex-1">
          <p className="section-label">Author</p>
          <h2 className="mt-1 text-2xl font-black">{post.author}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Writes practical guides on creator workflows, platform changes, and fast ways to move media safely across teams.
          </p>
        </div>
        <button className="rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:scale-[1.02]">
          Follow
        </button>
      </div>
    </section>
  );
}

function RelatedCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}` as `/blog/${string}`} className="group overflow-hidden rounded-[1.5rem] border bg-card shadow-soft transition hover:-translate-y-1 hover:border-primary/30">
      <div className="relative aspect-video overflow-hidden">
        {post.featuredImageUrl ? (
          <Image src={post.featuredImageUrl} alt={post.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/15 to-secondary/15" />
        )}
      </div>
      <div className="p-5">
        {post.category && <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary"><Tag className="h-3 w-3" />{post.category}</span>}
        <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight">{post.title}</h3>
        <p className="mt-3 text-xs text-muted-foreground">{postDate(post)} · {estimateReadingTime(post.excerpt)} min read</p>
      </div>
    </Link>
  );
}

function Comments({ comments }: { comments: Array<{ name: string; text: string; likes: number; replies?: number }> }) {
  return (
    <section className="mt-8 rounded-[2rem] border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Discussion</p>
          <h2 className="mt-1 text-2xl font-black">Reader notes</h2>
        </div>
        <MessageCircle className="h-6 w-6 text-primary" />
      </div>
      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <div key={comment.name} className="rounded-[1.5rem] border bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black">
                {initials(comment.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{comment.name}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="h-3 w-3" />{comment.likes}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{comment.text}</p>
                {comment.replies ? <p className="mt-3 text-xs font-bold text-primary">{comment.replies} replies</p> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildComments(seed: string) {
  return [
    {
      name: "Maya Chen",
      text: "The workflow framing is excellent. This is the kind of operational detail that makes a guide useful beyond the first read.",
      likes: stableMetric(`${seed}-maya`, 8, 34),
      replies: 2,
    },
    {
      name: "Arjun Patel",
      text: "Clean explanation and strong examples. The reading experience also makes this very easy to scan on mobile.",
      likes: stableMetric(`${seed}-arjun`, 6, 29),
    },
  ];
}
