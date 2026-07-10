"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/components/media/video-player";
import { WatermarkEditor } from "@/components/media/watermark-editor";
import { Button } from "@/components/ui/button";
import {
  fetchVideoDetail,
  formatTime,
  createClip,
  convertVideo,
  extractAudio,
  applyWatermark,
  applyWatermarkToClip,
  type VideoDetail,
  type WatermarkConfig,
} from "@/services/media-api";
import { apiUrl } from "@/lib/api-url";
import { Scissors, Sparkles, RefreshCw, Music, Loader2, Download, AlertCircle } from "lucide-react";

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"clip" | "watermark" | "convert" | "extract">("clip");
  
  // Processing triggers
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Clipping tab state
  const [clipTitle, setClipTitle] = useState("My Clip");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [lastClipId, setLastClipId] = useState<string | null>(null);
  const [isWatermarkingClip, setIsWatermarkingClip] = useState(false);

  // Conversion tab state
  const [convFormat, setConvFormat] = useState("mp4");
  const [convQuality, setConvQuality] = useState("medium");
  const [convResolution, setConvResolution] = useState("");
  const [convFps, setConvFps] = useState("");

  // Extraction tab state
  const [extFormat, setExtFormat] = useState("mp3");
  const [extBitrate, setExtBitrate] = useState("192k");
  const [preserveMeta, setPreserveMeta] = useState(true);

  const loadVideo = useCallback(async () => {
    try {
      const data = await fetchVideoDetail(videoId);
      setVideo(data);
      // Initialize clipping boundaries
      if (data && data.durationSeconds && endTime === 10) {
        setEndTime(Math.min(data.durationSeconds, 30));
      }
    } catch {
      setVideo(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  const hasActiveJobs = video?.jobs?.some((j) => j.status === "processing" || j.status === "pending") ?? false;

  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      void loadVideo();
    }, 2000);
    return () => clearInterval(interval);
  }, [loadVideo, hasActiveJobs]);

  const playbackSrc = video?.playbackUrl
    ? video.playbackUrl.startsWith("http")
      ? video.playbackUrl
      : apiUrl(video.playbackUrl.replace(/^\/api/, ""))
    : "";

  const isImage = video?.mimeType?.startsWith("image/") ?? false;

  const handleGenerateClip = async () => {
    if (!video) return;
    setProcessing(true);
    try {
      const clip = await createClip(videoId, {
        title: clipTitle,
        startTime,
        endTime,
      });
      setLastClipId(clip.id);
      await loadVideo();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyWatermarkToClip = async (configs: WatermarkConfig[]) => {
    if (!lastClipId) return;
    setProcessing(true);
    try {
      await applyWatermarkToClip(lastClipId, `${clipTitle} (Watermarked)`, configs);
      setIsWatermarkingClip(false);
      setLastClipId(null);
      await loadVideo();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyWatermark = async (configs: WatermarkConfig[]) => {
    if (!video) return;
    setProcessing(true);
    try {
      await applyWatermark(videoId, `${video.title} (Watermarked)`, configs);
      await loadVideo();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!video) return;
    setProcessing(true);
    try {
      await convertVideo(videoId, {
        title: `${video.title} (${convFormat.toUpperCase()})`,
        format: convFormat,
        qualityPreset: convQuality,
        resolution: convResolution || undefined,
        fps: convFps ? parseInt(convFps) : undefined,
        bitrate: undefined,
        codec: undefined,
      });
      await loadVideo();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleExtractAudio = async () => {
    if (!video) return;
    setProcessing(true);
    try {
      await extractAudio(videoId, {
        title: `${video.title} (Audio)`,
        format: extFormat,
        bitrate: extBitrate || undefined,
        preserveMetadata: preserveMeta,
      });
      await loadVideo();
    } catch (err) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container-shell flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-semibold">Loading media workspace…</p>
      </div>
    );
  }

  if (!video) return <div className="container-shell py-10">Video not found</div>;

  const duration = video.durationSeconds ?? 0;

  return (
    <div className="container-shell py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
            ← My Media
          </Link>
          <h1 className="text-2xl font-extrabold mt-1 tracking-tight">{video.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary uppercase">
              {isImage ? "Image" : "Video"}
            </span>
            {duration > 0 && <span>· {formatTime(duration)}</span>}
            {video.fileSize && <span>· {(video.fileSize / (1024 * 1024)).toFixed(1)} MB</span>}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Playback Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-xl aspect-video flex items-center justify-center">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={playbackSrc} alt="" className="max-h-full max-w-full object-contain" />
            ) : playbackSrc ? (
              <VideoPlayer
                src={playbackSrc}
                duration={duration}
                onTimeUpdate={setCurrentTime}
                seekTo={null}
                className="w-full h-full"
              />
            ) : (
              <p className="text-muted-foreground">No media available</p>
            )}
          </div>

          {/* Workbench Tabs */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex border-b border-border bg-muted/40">
              {[
                { id: "clip", label: "Clip Media", icon: Scissors, disabled: isImage },
                { id: "watermark", label: "Watermark", icon: Sparkles, disabled: false },
                { id: "convert", label: "Convert format", icon: RefreshCw, disabled: isImage },
                { id: "extract", label: "Extract Audio", icon: Music, disabled: isImage },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id as "clip" | "watermark" | "convert" | "extract")}
                  className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-bold border-b-2 transition ${
                    tab.disabled
                      ? "opacity-35 cursor-not-allowed"
                      : activeTab === tab.id
                      ? "border-primary text-primary bg-background"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "clip" && (() => {
                const lastClip = video?.clips?.find((c) => c.id === lastClipId);
                
                if (lastClip) {
                  if (lastClip.status === "pending" || lastClip.status === "processing") {
                    return (
                      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-muted/20 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="text-center">
                          <h4 className="font-bold text-base animate-pulse">Generating Clip...</h4>
                          <p className="text-sm text-muted-foreground mt-1">Please wait while we extract your clip segment.</p>
                        </div>
                      </div>
                    );
                  }
                  
                  if (lastClip.status === "failed") {
                    return (
                      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-rose-500/5 space-y-4">
                        <AlertCircle className="h-8 w-8 text-rose-500" />
                        <div className="text-center">
                          <h4 className="font-bold text-base text-rose-500">Generation Failed</h4>
                          <p className="text-sm text-muted-foreground mt-1">An error occurred during generation. Please check the Jobs panel for details.</p>
                        </div>
                        <Button variant="secondary" onClick={() => setLastClipId(null)}>Try Again</Button>
                      </div>
                    );
                  }
                  
                  if (lastClip.status === "completed") {
                    const clipSrc = lastClip.downloadUrl
                      ? lastClip.downloadUrl.startsWith("http")
                        ? lastClip.downloadUrl
                        : apiUrl(lastClip.downloadUrl.replace(/^\/api/, ""))
                      : "";

                    if (isWatermarkingClip) {
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <h3 className="font-bold text-base flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Add Watermark to Clip
                            </h3>
                            <Button size="sm" variant="ghost" onClick={() => setIsWatermarkingClip(false)}>Cancel</Button>
                          </div>
                          <WatermarkEditor
                            mediaUrl={clipSrc}
                            isImage={false}
                            videoWidth={video.width || 1280}
                            videoHeight={video.height || 720}
                            videoDuration={lastClip.durationSeconds || (lastClip.endTime - lastClip.startTime)}
                            onApply={handleApplyWatermarkToClip}
                            loading={processing}
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <h3 className="font-bold text-base flex items-center gap-2">
                            <Scissors className="h-5 w-5 text-primary" /> Clip Preview
                          </h3>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold uppercase">Ready</span>
                        </div>

                        <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden relative border border-border">
                          <video src={clipSrc} controls className="h-full w-full object-contain" />
                        </div>

                        <div className="flex gap-3 mt-4">
                          <Button onClick={() => setIsWatermarkingClip(true)} className="flex-1 font-bold shadow-glow">
                            <Sparkles className="h-4 w-4 mr-2" /> Add Watermark
                          </Button>
                          <Button variant="secondary" onClick={() => setLastClipId(null)} className="flex-1 font-semibold">
                            Clip Another Segment
                          </Button>
                        </div>
                      </div>
                    );
                  }
                }

                // Default clipping configuration form
                return (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Time</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={duration}
                            value={startTime}
                            onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                          />
                          <Button variant="secondary" onClick={() => setStartTime(currentTime)}>
                            Use Player
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Time</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max={duration}
                            value={endTime}
                            onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                          />
                          <Button variant="secondary" onClick={() => setEndTime(currentTime)}>
                            Use Player
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output Title</label>
                      <input
                        type="text"
                        value={clipTitle}
                        onChange={(e) => setClipTitle(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="My Clip Title"
                      />
                    </div>

                    <Button onClick={handleGenerateClip} disabled={processing} className="w-full font-bold">
                      {processing ? "Queuing..." : "Generate Clip"}
                    </Button>
                  </div>
                );
              })()}

              {activeTab === "watermark" && (
                <WatermarkEditor
                  mediaUrl={playbackSrc}
                  isImage={isImage}
                  videoWidth={video.width || 1280}
                  videoHeight={video.height || 720}
                  videoDuration={duration}
                  onApply={handleApplyWatermark}
                  loading={processing}
                />
              )}

              {activeTab === "convert" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Format</label>
                      <select
                        value={convFormat}
                        onChange={(e) => setConvFormat(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="mp4">MP4 (H.264)</option>
                        <option value="webm">WEBM (VP9)</option>
                        <option value="mov">MOV</option>
                        <option value="mkv">MKV</option>
                        <option value="avi">AVI</option>
                        <option value="flv">FLV</option>
                        <option value="wmv">WMV</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quality Preset</label>
                      <select
                        value={convQuality}
                        onChange={(e) => setConvQuality(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="low">Low Quality</option>
                        <option value="medium">Medium Quality</option>
                        <option value="high">High Quality</option>
                        <option value="original">Original Quality</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution (Optional)</label>
                      <select
                        value={convResolution}
                        onChange={(e) => setConvResolution(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Keep Original</option>
                        <option value="1920x1080">1080p (Full HD)</option>
                        <option value="1280x720">720p (HD)</option>
                        <option value="854x480">480p</option>
                        <option value="640x360">360p</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FPS (Optional)</label>
                      <input
                        type="number"
                        value={convFps}
                        onChange={(e) => setConvFps(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="e.g. 30 or 60"
                      />
                    </div>
                  </div>

                  <Button onClick={handleConvert} disabled={processing} className="w-full font-bold">
                    {processing ? "Converting..." : "Convert Format"}
                  </Button>
                </div>
              )}

              {activeTab === "extract" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audio Format</label>
                      <select
                        value={extFormat}
                        onChange={(e) => setExtFormat(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="mp3">MP3</option>
                        <option value="aac">AAC</option>
                        <option value="wav">WAV</option>
                        <option value="flac">FLAC</option>
                        <option value="ogg">OGG</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bitrate (Optional)</label>
                      <select
                        value={extBitrate}
                        onChange={(e) => setExtBitrate(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="320k">320kbps (Highest)</option>
                        <option value="192k">192kbps (Standard)</option>
                        <option value="128k">128kbps (Medium)</option>
                        <option value="64k">64kbps (Low)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="preserve_meta"
                      checked={preserveMeta}
                      onChange={(e) => setPreserveMeta(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    <label htmlFor="preserve_meta" className="text-sm font-semibold cursor-pointer">
                      Preserve original metadata tags
                    </label>
                  </div>

                  <Button onClick={handleExtractAudio} disabled={processing} className="w-full font-bold">
                    {processing ? "Extracting..." : "Extract Audio"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel: Processing Jobs & Outputs list */}
        <div className="space-y-6">
          {/* Active Job monitor */}
          {video.jobs && video.jobs.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">Processing Jobs</h3>
              <div className="space-y-3">
                {video.jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-capitalize text-foreground">{job.jobType.replace("_", " ")}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          job.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : job.status === "failed"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    {job.status !== "completed" && job.status !== "failed" && (
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${job.progress}%` }} />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{job.message}</p>
                    {job.errorDetail && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="truncate">{job.errorDetail}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exported Outputs */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">Generated Outputs</h3>
            {video.clips && video.clips.length > 0 ? (
              <div className="space-y-3">
                {video.clips.map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/10 p-3.5">
                    <div className="min-w-0">
                      <p className="font-bold truncate text-sm">{clip.title}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {clip.startTime > 0 || clip.endTime > 0
                          ? `${formatTime(clip.startTime)} – ${formatTime(clip.endTime)}`
                          : "Full duration"}
                      </p>
                      <span
                        className={`inline-block text-[10px] uppercase font-bold mt-1.5 px-2 py-0.5 rounded ${
                          clip.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : clip.status === "failed"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {clip.status}
                      </span>
                    </div>

                    {clip.status === "completed" && clip.downloadUrl && (
                      <a
                        href={clip.downloadUrl.startsWith("http") ? clip.downloadUrl : apiUrl(clip.downloadUrl.replace(/^\/api/, ""))}
                        download
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition shadow-sm"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No outputs generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
