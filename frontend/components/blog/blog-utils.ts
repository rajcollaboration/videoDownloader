import type { BlogPost, BlogPostSummary } from "@/services/api";

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function estimateReadingTime(input: string | null | undefined): number {
  const text = stripHtml(input ?? "");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function stableMetric(seed: string, min: number, max: number): number {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return min + (total % Math.max(1, max - min + 1));
}

export function postDate(post: Pick<BlogPostSummary, "publishedAt" | "createdAt">): string {
  return new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function collectPopularTags(posts: BlogPostSummary[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function categoryCounts(posts: BlogPostSummary[], categories: string[]): Array<{ name: string; count: number }> {
  return categories.map((name) => ({
    name,
    count: posts.filter((post) => post.category === name).length,
  }));
}

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export function buildTableOfContents(content: string): TocItem[] {
  const matches = content.matchAll(/<h([2-3])[^>]*>(.*?)<\/h\1>/gi);
  return Array.from(matches).map((match, index) => ({
    id: `section-${index + 1}`,
    title: stripHtml(match[2]),
    level: Number(match[1]),
  }));
}

export function contentWithHeadingIds(content: string, toc: TocItem[]): string {
  let index = 0;
  return content.replace(/<h([2-3])([^>]*)>/gi, (match, level, attrs) => {
    const item = toc[index];
    index += 1;
    if (!item || /\sid=/.test(attrs)) return match;
    return `<h${level}${attrs} id="${item.id}">`;
  });
}

export function articleDescription(post: BlogPost): string {
  return post.excerpt || post.seoDescription || stripHtml(post.content).slice(0, 180);
}
