"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { z } from "zod";

import { InputBox } from "@/components/home/input-box";
import { DownloadResultCard } from "@/components/download-result-card";
import { ParallaxLoader } from "@/components/parallax-loader";
import { PlaylistProgressList } from "@/components/playlist-progress-list";
import { ProgressPanel } from "@/components/progress-panel";
import {
  isSupportedVideoUrl,
  isYouTubeUrl,
} from "@/lib/supported-platforms";
import { Alert } from "@/components/ui/alert";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  createDownloadJob,
  fetchDownloadJob,
  fetchMetadata,
  type DownloadJob,
  type VideoMetadata,
} from "@/services/api";

// ─── URL validation ───────────────────────────────────────────
const urlSchema = z
  .string()
  .url("Please enter a valid URL.")
  .refine(
    (v) => isSupportedVideoUrl(v),
    "Unsupported platform. Try TikTok, LinkedIn, Instagram, Facebook, X, Vimeo, Reddit, and more."
  )
  .refine(
    (v) => !isYouTubeUrl(v),
    "YouTube is not supported. All other major platforms are enabled."
  );

export function HeroDownloader() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [alert, setAlert] = useState<{
    title: string;
    description: string;
    variant: "error" | "info" | "success";
  } | null>(null);
  const { items, pushToast, dismissToast } = useToast();
  const retryPayload = useRef<{ requestId: string; formatId: string; audioOnly?: boolean } | null>(null);
  const progressAnchorRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Poll at 1 s intervals while job is active ───────────────
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const interval = window.setInterval(async () => {
      try {
        const next = await fetchDownloadJob(job.jobId);
        setJob(next);
      } catch {
        window.clearInterval(interval);
      }
    }, 1000); // 1 s — faster feedback

    return () => window.clearInterval(interval);
  }, [job]);

  // ─── Paste from clipboard ────────────────────────────────────
  useEffect(() => {
    if (!alert) return;

    const timeout = window.setTimeout(() => setAlert(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [alert]);

  useEffect(() => {
    if (job?.status !== "failed") return;

    const message = job.message || "Your download encountered an error.";
    setAlert({ title: "Download failed", description: message, variant: "error" });
    pushToast("Download failed", message, "error");
  }, [job?.status, job?.message, pushToast]);

  const showAlert = (title: string, description: string, variant: "error" | "info" | "success" = "error") => {
    setAlert({ title, description, variant });
    pushToast(title, description, variant);
  };

  const hideAlert = () => setAlert(null);

  async function handlePaste() {
    const focusForManualPaste = (description: string) => {
      const el = urlInputRef.current;
      el?.focus();
      el?.select();
      showAlert("Paste manually", description, "info");
    };

    // The Clipboard read API only exists in secure contexts (HTTPS or
    // localhost) and isn't implemented in some browsers (e.g. Firefox).
    // Fall back to focusing the input so the user can paste with
    // Ctrl/Cmd+V or a long-press, instead of a dead-end "error".
    if (!navigator.clipboard?.readText) {
      focusForManualPaste(
        "Automatic clipboard access isn't available on this connection. The link box is focused — press Ctrl+V (or Cmd+V, or long-press → Paste on mobile)."
      );
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      focusForManualPaste(
        "Clipboard permission was denied. The link box is focused — press Ctrl+V (or Cmd+V) to paste."
      );
    }
  }

  // ─── Fetch video metadata ────────────────────────────────────
  async function handleResolve() {
    // Zod validation before hitting the API
    const result = urlSchema.safeParse(url.trim());
    if (!result.success) {
      showAlert("Invalid URL", result.error.errors[0].message, "error");
      return;
    }

    setIsLoading(true);
    setJob(null);
    setMetadata(null);

    try {
      const response = await fetchMetadata(result.data);
      setMetadata(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resolve link.";
      showAlert("Link rejected", message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Start download job ───────────────────────────────────────
  async function handleStartDownload(formatId: string, audioOnly?: boolean) {
    if (!metadata) return;

    const payload = { requestId: metadata.requestId, formatId, audioOnly };
    retryPayload.current = payload;
    setIsQueueing(true);

    try {
      const response = await createDownloadJob(payload);
      setJob(response);
      if (metadata.isPlaylist) {
        pushToast(
          "Playlist queued",
          `Downloading ${metadata.itemsCount ?? "all"} videos in parallel — each one auto-saves when it finishes.`,
          "success"
        );
      } else {
        pushToast(
          "Download queued",
          "Your file is being processed and will auto-save when ready.",
          "success"
        );
      }
      // Smooth-scroll the progress panel into view once it mounts.
      requestAnimationFrame(() => {
        progressAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create job.";
      showAlert("Queue error", message, "error");
    } finally {
      setIsQueueing(false);
    }
  }

  // ─── Retry failed job ─────────────────────────────────────────
  async function handleRetry() {
    if (!retryPayload.current) return;
    try {
      const response = await createDownloadJob(retryPayload.current);
      setJob(response);
      pushToast("Retrying download", "Job requeued successfully.", "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retry failed.";
      showAlert("Retry failed", message, "error");
    }
  }

  // ─── Keyboard: Enter to submit ────────────────────────────────
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && url && !isLoading) handleResolve();
  }

  return (
    <>
      <Toast items={items} onDismiss={dismissToast} />
      <AnimatePresence>
        {alert ? (
          <Alert
            title={alert.title}
            description={alert.description}
            variant={alert.variant}
            onClose={hideAlert}
          />
        ) : null}
      </AnimatePresence>

      {/* ── Input card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-4"
      >
        <InputBox
          value={url}
          isLoading={isLoading}
          onChange={setUrl}
          onPaste={handlePaste}
          onSubmit={handleResolve}
          onClear={() => setUrl("")}
          onKeyDown={handleKeyDown}
          inputRef={urlInputRef}
        />

        {/* Trust badges */}
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          {[
            { icon: Zap, text: "Fast parallel processing · auto-save each video" },
            { icon: Sparkles, text: "Multi-quality · Audio extraction (MP3)" },
            { icon: ShieldCheck, text: "URL validation & abuse safeguards" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 rounded-xl border bg-card/60 px-4 py-3">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Results ── */}
      <AnimatePresence mode="popLayout">
        {/* Legal notice */}
        {metadata && (
          <motion.div
            key="legal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="legal-notice"
            className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"
          >
            {metadata.legalNotice}
          </motion.div>
        )}

        {/* Resolving metadata — parallax loader */}
        {isLoading && (
          <motion.div
            key="resolve-loader"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ParallaxLoader
              variant="resolve"
              title="Analyzing your link"
              subtitle="Detecting platform, quality options, and duration…"
            />
          </motion.div>
        )}

        {/* Queuing download job */}
        {isQueueing && !job && (
          <motion.div
            key="queue-loader"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ParallaxLoader
              variant="download"
              title="Preparing your download"
              subtitle="Starting background processing — hang tight…"
            />
          </motion.div>
        )}

        {/* Format card */}
        {metadata && !isLoading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DownloadResultCard data={metadata} onStartDownload={handleStartDownload} />
          </motion.div>
        )}

        {/* Progress panel */}
        {job && (
          <motion.div
            key="progress"
            ref={progressAnchorRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="scroll-mt-24"
          >
            <ProgressPanel
                job={job}
                sourceUrl={metadata?.sourceUrl}
                videoTitle={metadata?.title}
                onRetry={handleRetry}
              />
          </motion.div>
        )}

        {/* Playlist items */}
        {job?.playlistItems?.length ? (
          <motion.div
            key="playlist"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PlaylistProgressList items={job.playlistItems} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
