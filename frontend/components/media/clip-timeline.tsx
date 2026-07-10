"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime, parseTimeInput } from "@/services/media-api";
import { cn } from "@/lib/utils";

interface ClipTimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime?: number;
  onChange: (start: number, end: number) => void;
  className?: string;
}

export function ClipTimeline({ duration, startTime, endTime, currentTime = 0, onChange, className }: ClipTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const toPercent = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);

  const handleDrag = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !dragging) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = pct * duration;
      if (dragging === "start") {
        onChange(Math.min(time, endTime - 1), endTime);
      } else {
        onChange(startTime, Math.max(time, startTime + 1));
      }
    },
    [dragging, duration, startTime, endTime, onChange]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div ref={trackRef} className="relative h-10 rounded-lg bg-muted">
        <div
          className="absolute top-0 h-full rounded-lg bg-primary/30"
          style={{ left: `${toPercent(startTime)}%`, width: `${toPercent(endTime - startTime)}%` }}
        />
        {currentTime > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${toPercent(currentTime)}%` }}
          />
        )}
        <div
          className="absolute top-1/2 z-10 h-6 w-3 -translate-y-1/2 cursor-ew-resize rounded bg-primary shadow"
          style={{ left: `calc(${toPercent(startTime)}% - 6px)` }}
          onMouseDown={() => setDragging("start")}
        />
        <div
          className="absolute top-1/2 z-10 h-6 w-3 -translate-y-1/2 cursor-ew-resize rounded bg-primary shadow"
          style={{ left: `calc(${toPercent(endTime)}% - 6px)` }}
          onMouseDown={() => setDragging("end")}
        />
      </div>

      {dragging && (
        <div
          className="fixed inset-0 z-50 cursor-ew-resize"
          onMouseMove={(e) => handleDrag(e.clientX)}
          onMouseUp={() => setDragging(null)}
        />
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Start: <strong className="text-foreground">{formatTime(startTime)}</strong></span>
        <span>End: <strong className="text-foreground">{formatTime(endTime)}</strong></span>
        <span>Duration: <strong className="text-foreground">{formatTime(endTime - startTime)}</strong></span>
      </div>
    </div>
  );
}

interface ManualClipEditorProps {
  duration: number;
  currentTime: number;
  onGenerate: (start: number, end: number, title: string) => void;
  initialStart?: number;
  initialEnd?: number;
  loading?: boolean;
}

export function ManualClipEditor({
  duration,
  currentTime,
  onGenerate,
  initialStart = 0,
  initialEnd,
  loading,
}: ManualClipEditorProps) {
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd ?? Math.min(60, duration));
  const [title, setTitle] = useState("Clip");
  const [startInput, setStartInput] = useState(formatTime(initialStart));
  const [endInput, setEndInput] = useState(formatTime(initialEnd ?? Math.min(60, duration)));

  const handleTimelineChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    setStartInput(formatTime(start));
    setEndInput(formatTime(end));
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Manual Clip Editor</h3>

      <ClipTimeline
        duration={duration}
        startTime={startTime}
        endTime={endTime}
        currentTime={currentTime}
        onChange={handleTimelineChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => handleTimelineChange(currentTime, endTime)}>
          Mark Start
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleTimelineChange(startTime, currentTime)}>
          Mark End
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Start Time</label>
          <Input
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={() => {
              try {
                const t = parseTimeInput(startInput);
                handleTimelineChange(t, endTime);
              } catch { /* keep current */ }
            }}
            placeholder="00:00:00"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">End Time</label>
          <Input
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={() => {
              try {
                const t = parseTimeInput(endInput);
                handleTimelineChange(startTime, t);
              } catch { /* keep current */ }
            }}
            placeholder="00:01:00"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Clip Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <Button
        onClick={() => onGenerate(startTime, endTime, title)}
        disabled={loading || endTime <= startTime}
        className="w-full sm:w-auto"
      >
        {loading ? "Generating…" : "Generate Clip"}
      </Button>
    </div>
  );
}
