"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fetchMediaVideos, formatTime, type MediaVideo } from "@/services/media-api";

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-blue-500/10 text-blue-600",
  processing: "bg-yellow-500/10 text-yellow-600",
  ready: "bg-green-500/10 text-green-600",
  failed: "bg-red-500/10 text-red-600",
  pending: "bg-gray-500/10 text-gray-600",
};

export default function MyVideosPage() {
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchMediaVideos(page)
      .then((data) => {
        setVideos(data.videos);
        setTotalPages(data.totalPages);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="container-shell py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Videos</h1>
          <p className="text-muted-foreground">Manage your videos for AI search and clipping</p>
        </div>
        <Link href="/studio/upload">
          <Button>Upload Video</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No videos yet</p>
          <Link href="/studio/upload">
            <Button>Upload your first video</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/studio/videos/${video.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
            >
              <div className="aspect-video rounded-lg bg-muted mb-3 flex items-center justify-center text-muted-foreground">
                {video.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailPath} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <span className="text-3xl">🎬</span>
                )}
              </div>
              <h3 className="font-semibold truncate group-hover:text-primary transition">{video.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[video.status] ?? STATUS_COLORS.pending}`}>
                  {video.status}
                </span>
                {video.durationSeconds != null && (
                  <span className="text-xs text-muted-foreground">{formatTime(video.durationSeconds)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
