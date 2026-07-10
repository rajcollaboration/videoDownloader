"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadVideo, createVideoFromUrl } from "@/services/media-api";

const ACCEPTED = ".mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.aac,.ogg,.flac,.m4a,.png,.jpg,.jpeg,.webp,.gif";

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile && !title.trim()) {
      // Strip extension from filename to use as default title
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

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
      <h1 className="text-2xl font-bold mb-2">Upload Video / Audio / Image</h1>
      <p className="text-muted-foreground mb-8">
        Upload a video, audio, or image file, or import from a downloadable URL for AI search, clipping, and watermarking.
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
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a descriptive title" className="mt-1" />
        </div>

        {tab === "upload" ? (
          <>
            <div>
              <label className="text-sm font-medium">Media File (Video, Audio, Image)</label>
              <input
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                <strong>Video:</strong> MP4, MOV, WebM, MKV, AVI &nbsp;|&nbsp; 
                <strong>Audio:</strong> MP3, WAV, AAC, OGG, FLAC, M4A &nbsp;|&nbsp; 
                <strong>Image:</strong> PNG, JPG, JPEG, WebP, GIF &nbsp;(max 2GB)
              </p>
            </div>
            <Button onClick={() => void handleUpload()} disabled={loading || !file || !title.trim()} className="w-full font-bold shadow-glow mt-4">
              {loading ? "Uploading and Probing…" : "Upload & Continue"}
            </Button>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium">Media URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/file.mp4" className="mt-1" />
            </div>
            <Button onClick={() => void handleUrlImport()} disabled={loading || !url.trim()} className="w-full font-bold shadow-glow">
              {loading ? "Importing & Resolving…" : "Import from URL"}
            </Button>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
