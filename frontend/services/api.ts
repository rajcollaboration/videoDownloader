import { apiUrl } from "@/lib/api-url";

export interface VideoFormat {
  id: string;
  label: string;
  mimeType: string;
  quality: string;
  filesizeMb?: number;
  audioOnly?: boolean;
}

export interface VideoMetadata {
  requestId: string;
  platform: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  sourceUrl: string;
  formats: VideoFormat[];
  isPlaylist: boolean;
  itemsCount?: number;
  legalNotice: string;
}

export type JobStage =
  | "queued"
  | "fetching"
  | "downloading"
  | "processing"
  | "completed"
  | "failed";

export interface PlaylistItem {
  id: string;
  title: string;
  position: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  duration?: string;
  outputPath?: string | null;
  stage?: JobStage | null;
  etaSeconds?: number | null;
  speedBps?: number | null;
  downloadedBytes?: number | null;
  totalBytes?: number | null;
}

export interface DownloadJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  outputPath?: string | null;
  updatedAt?: string;
  playlistItems?: PlaylistItem[];
  stage?: JobStage | null;
  etaSeconds?: number | null;
  speedBps?: number | null;
  downloadedBytes?: number | null;
  totalBytes?: number | null;
}

export interface OverviewMetric {
  label: string;
  value: string;
}

export interface JobHistoryItem {
  jobId: string;
  title: string;
  platform: string;
  status: string;
  progress: number;
  createdAt: string;
  isPlaylist: boolean;
}

export interface DashboardOverview {
  metrics: OverviewMetric[];
  recentJobs: JobHistoryItem[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchMetadata(url: string) {
  return request<VideoMetadata>("/v1/videos/resolve", {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

export async function createDownloadJob(payload: {
  requestId: string;
  formatId: string;
  audioOnly?: boolean;
}) {
  // Map camelCase frontend fields → snake_case backend fields (FastAPI schema)
  return request<DownloadJob>("/v1/downloads", {
    method: "POST",
    body: JSON.stringify({
      request_id: payload.requestId,
      format_id: payload.formatId,
      audio_only: payload.audioOnly ?? false
    })
  });
}

export async function fetchDownloadJob(jobId: string) {
  return request<DownloadJob>(`/v1/downloads/${jobId}`);
}

export async function fetchDashboardOverview() {
  return request<DashboardOverview>("/v1/analytics/overview");
}

// ─── Blog types ──────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  status: "draft" | "published";
  featuredImageUrl?: string | null;
  category?: string | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  author: string;
  viewCount: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  status: "draft" | "published";
  featuredImageUrl?: string | null;
  category?: string | null;
  tags: string[];
  author: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type BlogPostApi = Omit<
  BlogPost,
  | "featuredImageUrl"
  | "seoTitle"
  | "seoDescription"
  | "seoKeywords"
  | "ogImageUrl"
  | "canonicalUrl"
  | "viewCount"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
> & {
  featured_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  view_count?: number;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  featuredImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  viewCount?: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BlogPostSummaryApi = Omit<
  BlogPostSummary,
  "featuredImageUrl" | "publishedAt" | "createdAt" | "updatedAt"
> & {
  featured_image_url?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  featuredImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BlogListResponseApi = Omit<BlogListResponse, "posts" | "pageSize" | "totalPages"> & {
  posts: BlogPostSummaryApi[];
  page_size?: number;
  total_pages?: number;
  pageSize?: number;
  totalPages?: number;
};

function normalizeBlogSummary(post: BlogPostSummaryApi): BlogPostSummary {
  return {
    ...post,
    featuredImageUrl: post.featuredImageUrl ?? post.featured_image_url ?? null,
    publishedAt: post.publishedAt ?? post.published_at ?? null,
    createdAt: post.createdAt ?? post.created_at ?? "",
    updatedAt: post.updatedAt ?? post.updated_at ?? "",
  };
}

function normalizeBlogPost(post: BlogPostApi): BlogPost {
  return {
    ...post,
    featuredImageUrl: post.featuredImageUrl ?? post.featured_image_url ?? null,
    seoTitle: post.seoTitle ?? post.seo_title ?? null,
    seoDescription: post.seoDescription ?? post.seo_description ?? null,
    seoKeywords: post.seoKeywords ?? post.seo_keywords ?? null,
    ogImageUrl: post.ogImageUrl ?? post.og_image_url ?? null,
    canonicalUrl: post.canonicalUrl ?? post.canonical_url ?? null,
    viewCount: post.viewCount ?? post.view_count ?? 0,
    publishedAt: post.publishedAt ?? post.published_at ?? null,
    createdAt: post.createdAt ?? post.created_at ?? "",
    updatedAt: post.updatedAt ?? post.updated_at ?? "",
  };
}

function normalizeBlogList(data: BlogListResponseApi): BlogListResponse {
  return {
    ...data,
    posts: data.posts.map(normalizeBlogSummary),
    pageSize: data.pageSize ?? data.page_size ?? 10,
    totalPages: data.totalPages ?? data.total_pages ?? 0,
  };
}

export type BlogPostCreate = Omit<BlogPost, "id" | "viewCount" | "publishedAt" | "createdAt" | "updatedAt">;
export type BlogPostUpdate = Partial<BlogPostCreate>;

// ─── Blog API ────────────────────────────────────────────────────────────────

export async function fetchPublishedPosts(params?: { page?: number; category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.category) qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  const data = await request<BlogListResponseApi>(`/v1/blog/?${qs}`);
  return normalizeBlogList(data);
}

export async function fetchPostBySlug(slug: string) {
  const post = await request<BlogPostApi>(`/v1/blog/${slug}`);
  return normalizeBlogPost(post);
}

export async function fetchCategories(): Promise<string[]> {
  return request<string[]>("/v1/blog/categories");
}

export async function adminFetchCategories(adminKey: string): Promise<string[]> {
  return request<string[]>("/v1/blog/admin/categories", {
    headers: { "X-Admin-Key": adminKey },
  });
}

export async function adminUploadImage(
  adminKey: string,
  file: File
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(apiUrl("/v1/blog/admin/images/upload"), {
    method: "POST",
    headers: { "X-Admin-Key": adminKey },
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Upload failed");
  }
  return response.json();
}

export async function adminFetchPosts(adminKey: string, params?: { page?: number; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.status) qs.set("status", params.status);
  const data = await request<BlogListResponseApi>(`/v1/blog/admin/posts?${qs}`, {
    headers: { "X-Admin-Key": adminKey }
  });
  return normalizeBlogList(data);
}

export async function adminCreatePost(adminKey: string, payload: BlogPostCreate) {
  const post = await request<BlogPostApi>("/v1/blog/admin/posts", {
    method: "POST",
    body: JSON.stringify(toSnakeCase(payload)),
    headers: { "X-Admin-Key": adminKey }
  });
  return normalizeBlogPost(post);
}

export async function adminUpdatePost(adminKey: string, id: string, payload: BlogPostUpdate) {
  const post = await request<BlogPostApi>(`/v1/blog/admin/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(toSnakeCase(payload)),
    headers: { "X-Admin-Key": adminKey }
  });
  return normalizeBlogPost(post);
}

export async function adminDeletePost(adminKey: string, id: string) {
  return request<void>(`/v1/blog/admin/posts/${id}`, {
    method: "DELETE",
    headers: { "X-Admin-Key": adminKey }
  });
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    result[snake] = value;
  }
  return result;
}
