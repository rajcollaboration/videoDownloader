"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadVideo, createVideoFromUrl } from "@/services/media-api";

const ACCEPTED = ".mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.aac,.ogg,.flac,.m4a";

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const video = await uploadVideo(file, title);
      router.push(`/studio/videos/${video.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const video = await createVideoFromUrl(url, title || undefined);
      router.push(`/studio/videos/${video.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shell py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Upload Video / Audio</h1>
      <p className="text-muted-foreground mb-8">
        Upload a video or audio file, or import from a downloadable URL for AI search and clipping.
      </p>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "upload" ? "default" : "secondary"} onClick={() => setTab("upload")}>
          File Upload
        </Button>
        <Button variant={tab === "url" ? "default" : "secondary"} onClick={() => setTab("url")}>
          From URL
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting recording" className="mt-1" />
        </div>

        {tab === "upload" ? (
          <>
            <div>
              <label className="text-sm font-medium">Video / Audio File</label>
              <input
                type="file"
                accept={ACCEPTED}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Video: MP4, MOV, WebM, MKV, AVI &nbsp;|&nbsp; Audio: MP3, WAV, AAC, OGG, FLAC, M4A &nbsp;(max 2GB)</p>
            </div>
            <Button onClick={() => void handleUpload()} disabled={loading || !file || !title.trim()} className="w-full">
              {loading ? "Uploading…" : "Upload & Continue"}
            </Button>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium">Video URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
            <Button onClick={() => void handleUrlImport()} disabled={loading || !url.trim()} className="w-full">
              {loading ? "Importing…" : "Import from URL"}
            </Button>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
