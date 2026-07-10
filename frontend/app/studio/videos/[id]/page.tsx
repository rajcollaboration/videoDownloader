"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { AISearchPanel } from "@/components/media/ai-search-panel";
import { ManualClipEditor } from "@/components/media/clip-timeline";
import { TranscriptViewer } from "@/components/media/transcript-viewer";
import { VideoPlayer } from "@/components/media/video-player";
import { Button } from "@/components/ui/button";
import {
  createClip,
  fetchVideoDetail,
  formatTime,
  searchVideo,
  startVideoProcessing,
  type VideoDetail,
} from "@/services/media-api";
import { apiUrl } from "@/lib/api-url";

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [clipLoading, setClipLoading] = useState(false);
  const [refineRange, setRefineRange] = useState<{ start: number; end: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadVideo = useCallback(async () => {
    try {
      const data = await fetchVideoDetail(videoId);
      setVideo(data);
    } catch {
      setVideo(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadVideo();
    const interval = setInterval(() => {
      if (video?.status === "processing" || video?.jobs.some((j) => j.status === "processing")) {
        void loadVideo();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadVideo, video?.status, video?.jobs]);

  const playbackSrc = video?.playbackUrl
    ? video.playbackUrl.startsWith("http")
      ? video.playbackUrl
      : apiUrl(video.playbackUrl.replace(/^\/api/, ""))
    : "";

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await startVideoProcessing(videoId);
      await loadVideo();
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateClip = async (start: number, end: number, title: string, searchQuery?: string) => {
    setClipLoading(true);
    try {
      await createClip(videoId, { title, startTime: start, endTime: end, source: searchQuery ? "ai_search" : "manual", searchQuery });
      await loadVideo();
    } finally {
      setClipLoading(false);
    }
  };

  if (loading) return <div className="container-shell py-10">Loading…</div>;
  if (!video) return <div className="container-shell py-10">Video not found</div>;

  const duration = video.durationSeconds ?? 0;

  return (
    <div className="container-shell py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">← My Videos</Link>
          <h1 className="text-2xl font-bold mt-1">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            {video.status} {duration > 0 && `· ${formatTime(duration)}`}
          </p>
        </div>
        {video.status !== "processing" && video.status !== "ready" && (
          <Button onClick={() => void handleProcess()} disabled={processing}>
            {processing ? "Starting…" : "Start AI Processing"}
          </Button>
        )}
      </div>

      {playbackSrc && (
        <VideoPlayer
          src={playbackSrc}
          duration={duration}
          onTimeUpdate={setCurrentTime}
          seekTo={seekTo}
          className="w-full"
        />
      )}

      {/* Job status */}
      {video.jobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">Processing Jobs</h3>
          {video.jobs.slice(0, 3).map((job) => (
            <div key={job.id} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{job.jobType}</span>
              <span>{job.status}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{job.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <TranscriptViewer
          segments={video.transcript?.segments ?? []}
          currentTime={currentTime}
          onSeek={(t) => setSeekTo(t)}
        />

        <div className="space-y-6">
          {video.status === "ready" && (
            <AISearchPanel
              onSearch={(q) => searchVideo(videoId, q)}
              onPlaySegment={(start) => setSeekTo(start)}
              onGenerateClip={(start, end, title, query) => void handleGenerateClip(start, end, title, query)}
              onRefineSelection={(start, end) => setRefineRange({ start, end })}
              loading={clipLoading}
            />
          )}

          <ManualClipEditor
            duration={duration || 3600}
            currentTime={currentTime}
            initialStart={refineRange?.start}
            initialEnd={refineRange?.end}
            onGenerate={(start, end, title) => void handleGenerateClip(start, end, title)}
            loading={clipLoading}
          />
        </div>
      </div>

      {/* Topics */}
      {video.topics.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold mb-3">Detected Topics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {video.topics.map((topic) => (
              <div key={topic.id} className="rounded-lg border border-border p-3">
                <div className="font-medium">{topic.title}</div>
                <div className="text-sm text-primary font-mono">
                  {formatTime(topic.startTime)} – {formatTime(topic.endTime)}
                </div>
                {topic.summary && <p className="text-sm text-muted-foreground mt-1">{topic.summary}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clips */}
      {video.clips.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold mb-3">Generated Clips</h3>
          <div className="space-y-2">
            {video.clips.map((clip) => (
              <div key={clip.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="font-medium">{clip.title}</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {formatTime(clip.startTime)} – {formatTime(clip.endTime)} · {clip.status}
                  </div>
                </div>
                {clip.downloadUrl && clip.status === "completed" && (
                  <a
                    href={clip.downloadUrl.startsWith("http") ? clip.downloadUrl : apiUrl(clip.downloadUrl.replace(/^\/api/, ""))}
                    download
                    className="text-sm text-primary hover:underline"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
