"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  FilePlus,
  FolderOpen,
  ImagePlus,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  adminCreatePost,
  adminDeletePost,
  adminFetchCategories,
  adminFetchPosts,
  adminUpdatePost,
  adminUploadImage,
  type BlogPostCreate,
  type BlogPostSummary,
} from "@/services/api";
import { Button } from "@/components/ui/button";

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255);
}

const emptyForm = (): BlogPostCreate => ({
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  status: "published",
  featuredImageUrl: "",
  category: "",
  tags: [],
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogImageUrl: "",
  canonicalUrl: "",
  author: "ClipFetch Team",
});

// ─── Post form ───────────────────────────────────────────────────────────────

function PostForm({
  initial,
  categories,
  onSave,
  onCancel,
  adminKey,
}: {
  initial: (BlogPostCreate & { id?: string }) | null;
  categories: string[];
  onSave: () => void;
  onCancel: () => void;
  adminKey: string;
}) {
  const [form, setForm] = useState<BlogPostCreate & { id?: string }>(
    initial ?? emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState(form.tags.join(", "));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof BlogPostCreate, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation before sending to server
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const result = await adminUploadImage(adminKey, file);
      set("featuredImageUrl", result.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(
        msg.includes("500") || msg.includes("processing")
          ? "Server error — make sure the backend is running and rebuilt after the latest changes."
          : msg
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: BlogPostCreate = {
      ...form,
      slug: form.slug || slugify(form.title),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      if (form.id) {
        await adminUpdatePost(adminKey, form.id, payload);
      } else {
        await adminCreatePost(adminKey, payload);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const descLen = form.seoDescription?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 pt-8">
      <div className="card-surface w-full max-w-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">
            {form.id ? "Edit Post" : "New Post"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-xl border p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!form.id) set("slug", slugify(e.target.value));
                }}
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                placeholder="Post title"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Slug <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 font-mono text-sm outline-none focus:border-primary/50"
                placeholder="my-post-slug"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as "draft" | "published")
                }
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {/* Category — datalist lets user pick existing OR type a new one */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Category
                {categories.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({categories.length} existing)
                  </span>
                )}
              </label>
              <input
                list="category-suggestions"
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                placeholder="Select or type a new category…"
                autoComplete="off"
              />
              <datalist id="category-suggestions">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Tags{" "}
                <span className="font-normal text-muted-foreground">
                  (comma-separated)
                </span>
              </label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                placeholder="instagram, video, guide"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Author
              </label>
              <input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
              />
            </div>

            {/* Excerpt */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">
                Excerpt
              </label>
              <textarea
                value={form.excerpt ?? ""}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                placeholder="Short description shown in post listings"
              />
            </div>

            {/* Featured Image */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">
                Featured Image
              </label>

              {/* URL input + Upload button */}
              <div className="flex gap-2">
                <input
                  value={form.featuredImageUrl ?? ""}
                  onChange={(e) => set("featuredImageUrl", e.target.value)}
                  type="text"
                  className="min-w-0 flex-1 rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="Paste image URL  or  upload below →"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="flex shrink-0 items-center gap-2 rounded-xl border bg-card/70 px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-50"
                  title="Upload image — JPEG/PNG/WebP/GIF, max 5 MB. Automatically compressed and converted to WebP."
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>

              {/* Upload status */}
              {uploadError && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-500">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {uploadError}
                </p>
              )}
              {!uploadError && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Accepted: JPEG, PNG, WebP, GIF (max 5 MB). Auto-compressed to
                  WebP.
                </p>
              )}

              {/* Image preview */}
              {form.featuredImageUrl && (
                <div className="mt-3 group relative overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.featuredImageUrl}
                    alt="Featured image preview"
                    className="max-h-48 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => set("featuredImageUrl", "")}
                    className="absolute right-2 top-2 rounded-lg bg-background/80 p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1.5">
                Content{" "}
                <span className="font-normal text-muted-foreground">
                  (HTML supported)
                </span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                rows={16}
                className="w-full resize-y rounded-xl border bg-card/70 px-4 py-2.5 font-mono text-sm outline-none focus:border-primary/50"
                placeholder="Write post content here. HTML tags are supported."
              />
            </div>
          </div>

          {/* SEO settings */}
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer select-none text-sm font-semibold">
              SEO Settings
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">
                  SEO Title
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {form.seoTitle?.length ?? 0}/60
                  </span>
                </label>
                <input
                  value={form.seoTitle ?? ""}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="Override browser tab title (60 chars ideal)"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">
                  Meta Description
                  <span
                    className={`ml-2 text-xs font-normal ${
                      descLen > 160
                        ? "font-bold text-rose-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {descLen}/160
                  </span>
                </label>
                <textarea
                  value={form.seoDescription ?? ""}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  rows={2}
                  maxLength={320}
                  className="w-full resize-none rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="160-character description shown in search results"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Keywords
                </label>
                <input
                  value={form.seoKeywords ?? ""}
                  onChange={(e) => set("seoKeywords", e.target.value)}
                  className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="keyword1, keyword2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  OG Image URL
                </label>
                <input
                  value={form.ogImageUrl ?? ""}
                  onChange={(e) => set("ogImageUrl", e.target.value)}
                  type="text"
                  className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="https://…"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5">
                  Canonical URL
                </label>
                <input
                  value={form.canonicalUrl ?? ""}
                  onChange={(e) => set("canonicalUrl", e.target.value)}
                  type="url"
                  className="w-full rounded-xl border bg-card/70 px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                  placeholder="https://… (leave blank to auto-generate)"
                />
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<
    (BlogPostCreate & { id?: string }) | null
  >(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(
    async (key: string) => {
      setLoading(true);
      setError(null);
      try {
        const [postsData, catsData] = await Promise.all([
          adminFetchPosts(key, { status: statusFilter || undefined }),
          adminFetchCategories(key),
        ]);
        setPosts(postsData.posts);
        setTotal(postsData.total);
        setCategories(catsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setAdminKey("");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdminKey(keyInput);
    await loadData(keyInput);
  }

  async function handleDelete(id: string) {
    try {
      await adminDeletePost(adminKey, id);
      setSuccess("Post deleted.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDelete(null);
      // Refresh categories in case the last post with a category was deleted
      adminFetchCategories(adminKey).then(setCategories).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  useEffect(() => {
    if (adminKey) loadData(adminKey);
  }, [adminKey, statusFilter, loadData]);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
        <div className="card-surface w-full max-w-sm p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold">Blog Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your admin API key to access the dashboard.
          </p>
          {error && (
            <p className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
              {error}
            </p>
          )}
          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              required
              autoFocus
              placeholder="Admin API key"
              className="w-full rounded-xl border bg-card/70 px-4 py-3 text-sm outline-none focus:border-primary/50"
            />
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;

  return (
    <div className="container-shell py-10 space-y-10">
      {/* Notification */}
      {(success || error) && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm ${
            success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{success ?? error}</span>
          <button className="ml-auto" onClick={() => { setSuccess(null); setError(null); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Blog Posts section ── */}
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Admin</p>
            <h1 className="mt-1 text-3xl font-extrabold">Blog Posts</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{total} total</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {publishedCount} published
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-amber-600 dark:text-amber-400">
                {draftCount} draft
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border bg-card/80 px-3 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All statuses</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => loadData(adminKey)}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingPost(emptyForm());
                setShowForm(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading && posts.length === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="card-surface flex flex-col items-center gap-4 py-20 text-center">
              <FilePlus className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                No posts yet. Create your first one!
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="card-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Thumbnail */}
                <div className="hidden h-14 w-20 shrink-0 overflow-hidden rounded-lg border sm:block">
                  {post.featuredImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.featuredImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImagePlus className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        post.status === "published"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {post.status}
                    </span>
                    {post.category && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Tag className="h-2.5 w-2.5" />
                        {post.category}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-bold">{post.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    /{post.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card/70 text-muted-foreground transition hover:text-foreground"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => {
                      setEditingPost({ ...post, content: "" } as BlogPostCreate & { id: string });
                      setShowForm(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card/70 text-muted-foreground transition hover:text-foreground"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {confirmDelete === post.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-400"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-muted-foreground transition hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(post.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card/70 text-muted-foreground transition hover:border-rose-500/40 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Categories section ── */}
      <section className="card-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Categories</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {categories.length}
            </span>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No categories yet. Add a category when creating or editing a post.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count = posts.filter((p) => p.category === cat).length;
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5"
                >
                  <Tag className="h-3 w-3 text-primary" />
                  <span className="text-sm font-semibold">{cat}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick-add category by creating a post with that category */}
        <div className="mt-5 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">To add a new category:</span> click
            &ldquo;New Post&rdquo; above, type the category name in the Category
            field, and save the post. Categories are created automatically from
            post fields.
          </p>
        </div>
      </section>

      {/* Post form modal */}
      {showForm && editingPost !== null && (
        <PostForm
          initial={editingPost}
          categories={categories}
          adminKey={adminKey}
          onSave={async () => {
            setShowForm(false);
            setEditingPost(null);
            setSuccess("Post saved successfully.");
            await loadData(adminKey);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}
