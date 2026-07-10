"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchMediaVideos, formatTime, applyWatermarkBatch, uploadLogo, type MediaVideo } from "@/services/media-api";
import { createBatchDownload, fetchDownloadJob, pauseDownload, resumeDownload, cancelDownload, type DownloadJob } from "@/services/api";
import { 
  Plus, 
  Pause, 
  Play, 
  X, 
  Loader2,
  FileVideo,
  FileImage,
  Layers,
  Link2,
  Sparkles
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  processing: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  ready: "bg-green-500/10 text-green-600 dark:text-green-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  pending: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function MyVideosPage() {
  const [activeSection, setActiveSection] = useState<"media" | "batch-download" | "batch-watermark">("media");
  
  // Media library state
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Batch Downloader state
  const [urlsInput, setUrlsInput] = useState("");
  const [downloadAudioOnly, setDownloadAudioOnly] = useState(false);
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Batch Watermarker state
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [watermarkType, setWatermarkType] = useState<"text" | "logo">("text");
  const [wmText, setWmText] = useState("Property of {username}");
  const [wmLogoPath, setWmLogoPath] = useState("");
  const [wmPosition, setWmPosition] = useState("center");
  const [wmOpacity, setWmOpacity] = useState(1.0);
  const [wmRotation, setWmRotation] = useState(0);
  const [wmScale, setWmScale] = useState(0.15);
  const [wmFontSize, setWmFontSize] = useState(24);
  const [wmFontColor, setWmFontColor] = useState("#ffffff");
  const [batchWatermarkLoading, setBatchWatermarkLoading] = useState(false);

  // Load Media Library
  const loadMedia = () => {
    setLoading(true);
    fetchMediaVideos(page)
      .then((data) => {
        setVideos(data.videos);
        setTotalPages(data.totalPages);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMedia();
  }, [page]);

  // Poll active download jobs
  useEffect(() => {
    const activeJobs = downloadJobs.filter(j => j.status === "processing" || j.status === "pending");
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      Promise.all(
        downloadJobs.map(async (job) => {
          if (job.status === "processing" || job.status === "pending") {
            try {
              return await fetchDownloadJob(job.jobId);
            } catch {
              return job;
            }
          }
          return job;
        })
      ).then((updated) => {
        setDownloadJobs(updated);
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [downloadJobs]);

  // Handle batch download trigger
  const handleBatchDownload = async () => {
    const urls = urlsInput.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;

    setIsDownloading(true);
    try {
      const response = await createBatchDownload({ urls, audioOnly: downloadAudioOnly });
      setDownloadJobs([...response.jobs, ...downloadJobs]);
      setUrlsInput("");
      setActiveSection("batch-download");
    } catch (err) {
      alert("Failed to start batch download: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDownloading(false);
    }
  };

  // Download control actions
  const handlePause = async (jobId: string) => {
    try {
      await pauseDownload(jobId);
      setDownloadJobs(jobs => jobs.map(j => j.jobId === jobId ? { ...j, status: "paused", message: "Paused" } : j));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await resumeDownload(jobId);
      setDownloadJobs(jobs => jobs.map(j => j.jobId === jobId ? { ...j, status: "pending", message: "Resuming..." } : j));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelDownload(jobId);
      setDownloadJobs(jobs => jobs.map(j => j.jobId === jobId ? { ...j, status: "failed", message: "Cancelled" } : j));
    } catch (err) {
      console.error(err);
    }
  };

  // Upload watermark logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadLogo(file);
      setWmLogoPath(response.logoPath);
    } catch (err) {
      alert("Logo upload failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle batch watermarking trigger
  const handleBatchWatermark = async () => {
    if (selectedMediaIds.length === 0) {
      alert("Please select at least one media asset.");
      return;
    }

    setBatchWatermarkLoading(true);
    try {
      const watermarkConfig = {
        type: watermarkType,
        text: watermarkType === "text" ? wmText : undefined,
        logoPath: watermarkType === "logo" ? wmLogoPath : undefined,
        position: wmPosition,
        opacity: wmOpacity,
        scale: watermarkType === "logo" ? wmScale : undefined,
        rotation: wmRotation,
        margin: 10,
        padding: 0,
        fontSize: wmFontSize,
        fontColor: wmFontColor,
        outlineWidth: watermarkType === "text" ? 2 : 0,
        shadowOffsetX: watermarkType === "text" ? 2 : 0,
        shadowOffsetY: watermarkType === "text" ? 2 : 0,
      };

      await applyWatermarkBatch(selectedMediaIds, [watermarkConfig]);
      alert("Batch watermarking tasks queued successfully! Check status on each media file.");
      setSelectedMediaIds([]);
      loadMedia();
      setActiveSection("media");
    } catch (err) {
      alert("Batch watermarking failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBatchWatermarkLoading(false);
    }
  };

  const toggleSelectMedia = (id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="container-shell py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Media Studio</h1>
          <p className="text-muted-foreground mt-1">Manage, clip, convert, and watermark your files in batch.</p>
        </div>
        <Link href="/studio/upload">
          <Button className="shadow-glow">
            <Plus className="h-4 w-4 mr-2" /> Upload Media
          </Button>
        </Link>
      </div>

      {/* Quick Guide Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5 p-6 shadow-sm">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-foreground">
          <Sparkles className="h-5 w-5 text-primary" /> Welcome to Media Studio!
        </h2>
        <div className="grid gap-6 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="space-y-1.5">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">1</span>
              Add Your Assets
            </h3>
            <p className="leading-relaxed">
              Upload video, audio, or image files using the <strong>Upload Media</strong> button, or use the <strong>Batch URL Downloader</strong> to download and import external media.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">2</span>
              Open Media Workspace
            </h3>
            <p className="leading-relaxed">
              Click on any file in <strong>My Media Library</strong>. This opens the workspace where you can clip timelines, apply watermarks, convert formats, or extract audio.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">3</span>
              Run Batch Operations
            </h3>
            <p className="leading-relaxed">
              Select multiple files in your library and switch to the <strong>Batch Watermarker Wizard</strong> to configure and apply watermarks to many items simultaneously.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "media", label: "My Media Library", icon: FileVideo },
          { id: "batch-download", label: "Batch URL Downloader", icon: Link2 },
          { id: "batch-watermark", label: "Batch Watermarker Wizard", icon: Layers },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as "media" | "batch-download" | "batch-watermark")}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition ${
              activeSection === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Media Library tab */}
      {activeSection === "media" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/50">
              <p className="text-muted-foreground mb-4">No media assets in your library yet</p>
              <Link href="/studio/upload">
                <Button>Upload your first file</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const isImage = video.mimeType?.startsWith("image/");
                return (
                  <Link
                    key={video.id}
                    href={`/studio/videos/${video.id}`}
                    className="group relative rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-glow"
                  >
                    <div className="aspect-video rounded-xl bg-slate-900 mb-3 flex items-center justify-center text-muted-foreground overflow-hidden">
                      {video.thumbnailPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnailPath} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                      ) : isImage ? (
                        <FileImage className="h-10 w-10 text-primary/40" />
                      ) : (
                        <FileVideo className="h-10 w-10 text-primary/40" />
                      )}
                    </div>
                    <h3 className="font-bold truncate group-hover:text-primary transition">{video.title}</h3>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[video.status] ?? STATUS_COLORS.pending}`}>
                        {video.status}
                      </span>
                      {video.durationSeconds != null && video.durationSeconds > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">{formatTime(video.durationSeconds)}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-semibold ml-auto bg-muted px-2 py-0.5 rounded">
                        {isImage ? "IMAGE" : "VIDEO"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Batch Downloader Tab */}
      {activeSection === "batch-download" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Panel */}
          <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-lg">Add to Queue</h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video URLs</label>
              <textarea
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                placeholder="Paste URLs here (one per line)..."
                rows={6}
                className="w-full mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="audio_only"
                checked={downloadAudioOnly}
                onChange={(e) => setDownloadAudioOnly(e.target.checked)}
                className="rounded border-border accent-primary"
              />
              <label htmlFor="audio_only" className="text-sm font-semibold cursor-pointer">
                Download Audio Only (MP3)
              </label>
            </div>

            <Button onClick={handleBatchDownload} disabled={isDownloading || !urlsInput.trim()} className="w-full font-bold shadow-glow">
              {isDownloading ? "Queueing..." : "Start Batch Download"}
            </Button>
          </div>

          {/* Queue Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-lg">Download Queue</h3>
            {downloadJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Queue is empty. Enter URLs to start downloading.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {downloadJobs.map((job) => (
                  <div key={job.jobId} className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="truncate text-foreground max-w-[65%]">{job.message || "Downloading..."}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
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

                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="text-xs font-mono tabular-nums">{job.progress}%</span>
                    </div>

                    {/* Queue actions */}
                    <div className="flex justify-end gap-2 pt-1.5">
                      {job.status === "processing" && (
                        <Button size="sm" variant="secondary" onClick={() => handlePause(job.jobId)}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                      )}
                      {job.status === "paused" && (
                        <Button size="sm" variant="secondary" onClick={() => handleResume(job.jobId)}>
                          <Play className="h-3 w-3 mr-1" /> Resume
                        </Button>
                      )}
                      {(job.status === "processing" || job.status === "pending" || job.status === "paused") && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(job.jobId)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Watermarker Tab */}
      {activeSection === "batch-watermark" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Asset Selection List */}
          <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-lg">Select Assets</h3>
            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No media assets available.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => toggleSelectMedia(video.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedMediaIds.includes(video.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMediaIds.includes(video.id)}
                      onChange={() => {}} // toggled on container click
                      className="accent-primary"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{video.title}</p>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {video.mimeType?.startsWith("image/") ? "IMAGE" : "VIDEO"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-semibold">
              Selected: {selectedMediaIds.length} assets
            </p>
          </div>

          {/* Watermark Config Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-5">
            <h3 className="font-bold text-lg">Configure Watermark</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watermark Type</label>
                <div className="flex gap-2 mt-1.5">
                  <Button
                    variant={watermarkType === "text" ? "default" : "secondary"}
                    className="flex-1"
                    onClick={() => setWatermarkType("text")}
                  >
                    Text Watermark
                  </Button>
                  <Button
                    variant={watermarkType === "logo" ? "default" : "secondary"}
                    className="flex-1"
                    onClick={() => setWatermarkType("logo")}
                  >
                    Logo Watermark
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snap Position</label>
                <select
                  value={wmPosition}
                  onChange={(e) => setWmPosition(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="center">Center</option>
                  <option value="top_left">Top Left</option>
                  <option value="top_center">Top Center</option>
                  <option value="top_right">Top Right</option>
                  <option value="center_left">Center Left</option>
                  <option value="center_right">Center Right</option>
                  <option value="bottom_left">Bottom Left</option>
                  <option value="bottom_center">Bottom Center</option>
                  <option value="bottom_right">Bottom Right</option>
                </select>
              </div>
            </div>

            {watermarkType === "text" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watermark Text</label>
                  <input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Property of {username}"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Placeholders like {"{username}"}, {"{date}"}, {"{time}"} will be replaced on processing.
                  </p>
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Size</label>
                    <input
                      type="number"
                      value={wmFontSize}
                      onChange={(e) => setWmFontSize(parseInt(e.target.value) || 12)}
                      className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Color</label>
                    <input
                      type="color"
                      value={wmFontColor}
                      onChange={(e) => setWmFontColor(e.target.value)}
                      className="w-full mt-1 h-9 rounded-lg border border-border bg-background p-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload Watermark Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full mt-1 border border-border rounded-lg bg-background p-2 text-sm cursor-pointer"
                  />
                  {wmLogoPath && (
                    <p className="text-xs text-emerald-500 font-bold mt-1">Logo uploaded successfully!</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                    <span>Logo Scale (relative to video width)</span>
                    <span className="font-mono">{Math.round(wmScale * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={wmScale}
                    onChange={(e) => setWmScale(parseFloat(e.target.value))}
                    className="w-full mt-1 accent-primary"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round(wmOpacity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={wmOpacity}
                  onChange={(e) => setWmOpacity(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Rotation</span>
                  <span className="font-mono">{wmRotation}°</span>
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={wmRotation}
                  onChange={(e) => setWmRotation(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 accent-primary"
                />
              </div>
            </div>

            <Button
              onClick={handleBatchWatermark}
              disabled={batchWatermarkLoading || selectedMediaIds.length === 0 || (watermarkType === "logo" && !wmLogoPath)}
              className="w-full font-bold shadow-glow"
            >
              {batchWatermarkLoading ? "Processing Batch..." : `Apply to ${selectedMediaIds.length} Assets`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
