"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock3,
  Gauge,
  Download,
  PlayCircle,
  Layers,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/home/progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerBrowserDownload, filenameFromPath } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";
import type { PlaylistItem } from "@/services/api";

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
  const f = formatBytes(bps ?? undefined);
  return f ? `${f}/s` : null;
}

function formatEta(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

const statusStyles: Record<
  PlaylistItem["status"],
  { pill: string; ring: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    pill: "bg-foreground/5 text-muted-foreground",
    ring: "ring-border/50",
    icon: <Clock3 className="h-4 w-4 text-muted-foreground" />,
    label: "Queued",
  },
  processing: {
    pill: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    ring: "ring-sky-500/40",
    icon: <Loader2 className="h-4 w-4 animate-spin text-sky-500" />,
    label: "Downloading",
  },
  completed: {
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-500/40",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "Completed",
  },
  failed: {
    pill: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    ring: "ring-rose-500/40",
    icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
    label: "Failed",
  },
};

type FilterKey = "all" | "processing" | "completed" | "failed";

export function PlaylistProgressList({ items }: { items: PlaylistItem[] }) {
  const { pushToast } = useToast();
  const autoDownloaded = useRef<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const processing = items.filter((i) => i.status === "processing").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const pending = items.filter((i) => i.status === "pending").length;
    return { total, completed, processing, failed, pending };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, query]);

  // Auto-trigger browser download the moment an item transitions to completed.
  useEffect(() => {
    for (const item of items) {
      if (
        item.status === "completed" &&
        item.outputPath &&
        !autoDownloaded.current.has(item.id)
      ) {
        autoDownloaded.current.add(item.id);
        triggerBrowserDownload(
          item.outputPath,
          filenameFromPath(item.outputPath)
        );
      }
    }
  }, [items]);

  if (!items.length) return null;

  const pct = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <section
      className="card-surface overflow-hidden"
      data-testid="playlist-progress-list"
    >
      {/* ── Header + aggregate stats ── */}
      <div className="border-b bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="section-label">Playlist Progress</p>
              <h3 className="mt-0.5 text-xl font-bold sm:text-2xl">
                Downloading {stats.total} videos in parallel
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Each video auto-saves to your Downloads folder the moment it
                finishes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border bg-card/80 px-4 py-2 text-sm font-bold tabular-nums">
            <span className="text-2xl text-primary">{pct}%</span>
            <span className="text-muted-foreground">
              · {stats.completed}/{stats.total}
            </span>
          </div>
        </div>

        {/* Stat pills */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill
            label="Completed"
            value={stats.completed}
            tone="emerald"
            active={filter === "completed"}
            onClick={() =>
              setFilter((f) => (f === "completed" ? "all" : "completed"))
            }
          />
          <StatPill
            label="Downloading"
            value={stats.processing}
            tone="sky"
            active={filter === "processing"}
            onClick={() =>
              setFilter((f) => (f === "processing" ? "all" : "processing"))
            }
          />
          <StatPill
            label="Queued"
            value={stats.pending}
            tone="slate"
            active={false}
            onClick={() => setFilter("all")}
          />
          <StatPill
            label="Failed"
            value={stats.failed}
            tone="rose"
            active={filter === "failed"}
            onClick={() =>
              setFilter((f) => (f === "failed" ? "all" : "failed"))
            }
          />
        </div>

        {/* Search + filter reset */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title…"
              className="h-10 rounded-xl pl-9 text-sm"
            />
          </div>
          {(filter !== "all" || query) && (
            <Button
              size="sm"
              variant="secondary"
              className="h-10 rounded-xl"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {stats.total}
          </p>
        </div>
      </div>

      {/* ── Item grid ── */}
      <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground"
            >
              <Search className="h-6 w-6 opacity-50" />
              No items match the current filter.
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              layout
              className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.map((item, index) => (
                <PlaylistItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onManualDownload={() => {
                    if (item.outputPath) {
                      triggerBrowserDownload(
                        item.outputPath,
                        filenameFromPath(item.outputPath)
                      );
                      pushToast(
                        "Download started",
                        `Saving "${item.title}" to your Downloads folder.`,
                        "success"
                      );
                    }
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function PlaylistItemCard({
  item,
  index,
  onManualDownload,
}: {
  item: PlaylistItem;
  index: number;
  onManualDownload: () => void;
}) {
  const s = statusStyles[item.status];
  const speed = formatSpeed(item.speedBps);
  const eta = formatEta(item.etaSeconds);
  const sizeProgress =
    item.downloadedBytes && item.totalBytes
      ? `${formatBytes(item.downloadedBytes)} / ${formatBytes(item.totalBytes)}`
      : null;

  const progressVariant =
    item.status === "completed"
      ? "success"
      : item.status === "failed"
      ? "error"
      : "default";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 ring-1 ring-transparent transition-all hover:bg-card hover:shadow-soft",
        s.ring
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-[11px] font-bold tabular-nums text-muted-foreground">
          {item.position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight" title={item.title}>
            {item.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <PlayCircle className="h-3 w-3" />
            {item.duration ?? "—"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
            s.pill
          )}
        >
          {s.icon}
          {s.label}
        </span>
      </div>

      <ProgressBar
        value={item.progress}
        variant={progressVariant}
        statusLabel={item.stage ?? s.label}
      />

      {/* Live stats while downloading */}
      {item.status === "processing" && (speed || eta || sizeProgress) && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {speed && (
            <div className="flex items-center gap-1 rounded-lg bg-foreground/5 px-2 py-1">
              <Gauge className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate font-semibold tabular-nums">{speed}</span>
            </div>
          )}
          {eta && (
            <div className="flex items-center gap-1 rounded-lg bg-foreground/5 px-2 py-1">
              <Clock3 className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate font-semibold tabular-nums">{eta}</span>
            </div>
          )}
          {sizeProgress && (
            <div className="col-span-3 flex items-center gap-1 rounded-lg bg-foreground/5 px-2 py-1 sm:col-span-1">
              <span className="truncate font-medium tabular-nums text-muted-foreground">
                {sizeProgress}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Completed: manual re-download button */}
      {item.status === "completed" && item.outputPath && (
        <Button
          size="sm"
          variant="secondary"
          className="h-9 rounded-xl"
          onClick={onManualDownload}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download again
        </Button>
      )}
    </motion.article>
  );
}

/* ─────────────────────────────────────────────────────────────── */

const TONE_CLASSES: Record<
  "emerald" | "sky" | "slate" | "rose",
  { base: string; active: string; dot: string }
> = {
  emerald: {
    base: "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    active: "ring-2 ring-emerald-500/50",
    dot: "bg-emerald-500",
  },
  sky: {
    base: "bg-sky-500/5 text-sky-700 dark:text-sky-300",
    active: "ring-2 ring-sky-500/50",
    dot: "bg-sky-500",
  },
  slate: {
    base: "bg-foreground/5 text-muted-foreground",
    active: "ring-2 ring-foreground/20",
    dot: "bg-muted-foreground",
  },
  rose: {
    base: "bg-rose-500/5 text-rose-700 dark:text-rose-300",
    active: "ring-2 ring-rose-500/50",
    dot: "bg-rose-500",
  },
};

function StatPill({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_CLASSES;
  active: boolean;
  onClick: () => void;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
        t.base,
        active && t.active
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
        <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
        {label}
      </div>
      <span className="text-lg font-extrabold tabular-nums">{value}</span>
    </button>
  );
}
