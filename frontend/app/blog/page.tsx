import type { Metadata } from "next";

import { PremiumBlogIndex } from "@/components/blog/premium-blog-index";
import { fetchCategories, fetchPublishedPosts } from "@/services/api";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog - Guides & Video Downloading Tips",
  description:
    "Guides, tips, and platform how-tos from the ClipFetch team. Learn how to download videos from Instagram, TikTok, Facebook, and more.",
  alternates: { canonical: `${siteConfig.url}/blog` },
  openGraph: {
    title: "Blog - Guides & Video Downloading Tips",
    description: "Guides, tips, and platform how-tos from the ClipFetch team.",
    url: `${siteConfig.url}/blog`,
    type: "website",
    images: [{ url: `${siteConfig.url}/og-image.svg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Guides & Video Downloading Tips",
    description: "Guides, tips, and platform how-tos from the ClipFetch team.",
    images: [`${siteConfig.url}/og-image.svg`],
  },
};

interface Props {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
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
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const featuredPost = !isFiltered && page === 1 && data.posts.length > 0 ? data.posts[0] : null;
  const gridPosts = featuredPost ? data.posts.slice(1) : data.posts;

  return (
    <PremiumBlogIndex
      posts={data.posts}
      gridPosts={gridPosts}
      featuredPost={featuredPost}
      categories={categories}
      page={page}
      totalPages={data.totalPages}
      total={data.total}
      category={category}
      q={q}
    />
  );
}
