"use client";

import { useEffect, useRef } from "react";

import { formatTime, type TranscriptSegment } from "@/services/media-api";
import { cn } from "@/lib/utils";

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

export function TranscriptViewer({ segments, currentTime, onSeek, className }: TranscriptViewerProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentTime]);

  if (!segments.length) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-6 text-center text-muted-foreground", className)}>
        Transcript not available yet. Start processing to generate a transcript.
      </div>
    );
  }

  return (
    <div className={cn("max-h-[400px] overflow-y-auto rounded-xl border border-border bg-card", className)}>
      <div className="sticky top-0 border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
        <h3 className="text-sm font-semibold">Transcript</h3>
      </div>
      <div className="divide-y divide-border">
        {segments.map((seg) => {
          const isActive = currentTime >= seg.startTime && currentTime < seg.endTime;
          return (
            <button
              key={seg.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek(seg.startTime)}
              className={cn(
                "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/50",
                isActive && "bg-primary/10 border-l-2 border-l-primary"
              )}
            >
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                [{formatTime(seg.startTime)}]
              </span>
              <span className={cn("text-sm", isActive && "font-medium text-foreground")}>
                {seg.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
