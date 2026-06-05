"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  FolderDown,
  Gauge,
  Clock3,
} from "lucide-react";

import { ParallaxLoader } from "@/components/parallax-loader";
import { ProgressBar } from "@/components/home/progress-bar";
import { ShareButtons } from "@/components/share-buttons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { triggerBrowserDownload, filenameFromPath } from "@/lib/download";
import { cn } from "@/lib/utils";
import type { DownloadJob, JobStage } from "@/services/api";

interface ProgressPanelProps {
  job: DownloadJob;
  sourceUrl?: string;
  videoTitle?: string;
  onRetry?: () => void;
}

const stageLabels: Record<JobStage, string> = {
  queued: "Queued",
  fetching: "Fetching video…",
  downloading: "Downloading…",
  processing: "Processing…",
  completed: "Completed",
  failed: "Failed",
};

const statusConfig = {
  pending: {
    pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    icon: <Loader2 className="h-5 w-5 animate-spin text-amber-500" />,
    progressVariant: "default" as const,
  },
  processing: {
    pill: "bg-primary/10 text-primary",
    icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    progressVariant: "default" as const,
  },
  completed: {
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    progressVariant: "success" as const,
  },
  failed: {
    pill: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
    progressVariant: "error" as const,
  },
};

function formatBytes(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bps?: number | null): string | null {
  const formatted = formatBytes(bps ?? undefined);
  return formatted ? `${formatted}/s` : null;
}

function formatEta(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function ProgressPanel({ job, sourceUrl, videoTitle, onRetry }: ProgressPanelProps) {
  const config = statusConfig[job.status];
  const hasAutoDownloaded = useRef(false);
  const { pushToast } = useToast();
  const isPlaylist = (job.playlistItems?.length ?? 0) > 0;
  const completedItems =
    job.playlistItems?.filter((i) => i.status === "completed").length ?? 0;
  const failedItems =
    job.playlistItems?.filter((i) => i.status === "failed").length ?? 0;
  const processingItems =
    job.playlistItems?.filter((i) => i.status === "processing").length ?? 0;

  const stage: JobStage =
    job.stage ??
    (job.status === "completed"
      ? "completed"
      : job.status === "failed"
      ? "failed"
      : job.status === "pending"
      ? "queued"
      : "downloading");

  const speed = formatSpeed(job.speedBps);
  const eta = formatEta(job.etaSeconds);
  const sizeProgress =
    job.downloadedBytes && job.totalBytes
      ? `${formatBytes(job.downloadedBytes)} / ${formatBytes(job.totalBytes)}`
      : null;

  // Fire browser download once when job completes
  useEffect(() => {
    if (
      job.status === "completed" &&
      job.outputPath &&
      !hasAutoDownloaded.current
    ) {
      hasAutoDownloaded.current = true;
      triggerBrowserDownload(job.outputPath, filenameFromPath(job.outputPath));
      pushToast(
        "Saved to Downloads",
        "Your file has been saved to your browser's default Downloads folder.",
        "success"
      );
    }
  }, [job.status, job.outputPath, pushToast]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "card-surface overflow-hidden p-6 transition-colors",
        job.status === "completed" &&
          "border-emerald-500/30 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
      )}
      data-testid="download-progress-panel"
    >
      {(job.status === "pending" || job.status === "processing") && (
        <div className="mb-6">
          <ParallaxLoader
            variant="download"
            title={stageLabels[stage]}
            subtitle={job.message}
            progress={job.progress}
            className="!p-6"
          />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <p className="section-label">Download Status</p>
            <p className="mt-0.5 font-bold">{job.message}</p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em]",
            config.pill
          )}
        >
          {stageLabels[stage]}
        </span>
      </div>

      {/* Big percentage */}
      <div className="mt-6 flex items-end justify-between gap-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={job.progress}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold tabular-nums tracking-tight"
          >
            {job.progress}
            <span className="ml-1 text-2xl text-muted-foreground">%</span>
          </motion.p>
        </AnimatePresence>

        {isPlaylist ? (
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-300">
              {completedItems} done
            </span>
            {processingItems > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 font-bold text-sky-600 dark:text-sky-300">
                {processingItems} active
              </span>
            )}
            {failedItems > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 font-bold text-rose-600 dark:text-rose-300">
                {failedItems} failed
              </span>
            )}
            <span className="text-muted-foreground">
              / {job.playlistItems?.length} total
            </span>
          </div>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <ProgressBar
          value={job.progress}
          variant={config.progressVariant}
          statusLabel={stageLabels[stage]}
        />
      </div>

      {/* Live stats row — only shown while actively downloading a single file */}
      {(speed || eta || sizeProgress) &&
        job.status === "processing" &&
        !isPlaylist && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"
        >
          {speed && (
            <div className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2">
              <Gauge className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="section-label !text-[10px]">Speed</p>
                <p className="truncate font-semibold tabular-nums">{speed}</p>
              </div>
            </div>
          )}
          {eta && (
            <div className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2">
              <Clock3 className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="section-label !text-[10px]">ETA</p>
                <p className="truncate font-semibold tabular-nums">{eta}</p>
              </div>
            </div>
          )}
          {sizeProgress && (
            <div className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2 sm:col-span-1 col-span-2">
              <FolderDown className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="section-label !text-[10px]">Downloaded</p>
                <p className="truncate font-semibold tabular-nums">
                  {sizeProgress}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Completed banner */}
      {job.status === "completed" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <CheckCircle2 className="h-5 w-5" />
          </motion.div>
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              {isPlaylist
                ? `Playlist complete — ${completedItems}/${job.playlistItems?.length} saved`
                : "Download complete"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPlaylist
                ? "Every finished video was auto-saved to your browser's Downloads folder."
                : "The file has been saved to your browser's Downloads folder."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Share section */}
      {job.status === "completed" && sourceUrl && (
        <ShareButtons url={sourceUrl} title={videoTitle} label="Share this video" className="mt-5" />
      )}

      {/* Action buttons */}
      <div className="mt-5 flex flex-wrap gap-3">
        {job.status === "completed" && job.outputPath && (
          <Button
            size="sm"
            onClick={() =>
              triggerBrowserDownload(
                job.outputPath!,
                filenameFromPath(job.outputPath!)
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Download again
          </Button>
        )}

        {job.status === "failed" && onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </motion.section>
  );
}
