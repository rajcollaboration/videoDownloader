import type { MetadataRoute } from "next";

import { platformPages, siteConfig } from "@/lib/site";

const blogSlugs = [
  "how-to-download-instagram-videos",
  "best-video-downloader-tools"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0
    },
    {
      url: `${siteConfig.url}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    ...platformPages.map((page) => ({
      url: `${siteConfig.url}/${page.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9
    })),
    ...blogSlugs.map((slug) => ({
      url: `${siteConfig.url}/blog/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7
    }))
  ];
}

