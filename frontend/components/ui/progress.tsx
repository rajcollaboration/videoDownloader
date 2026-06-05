"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0–100
  variant?: "default" | "success" | "error";
  showShimmer?: boolean;
  className?: string;
}

const variantTrack: Record<string, string> = {
  default: "bg-foreground/10",
  success: "bg-emerald-500/15",
  error: "bg-rose-500/15",
};

const variantFill: Record<string, string> = {
  default: "bg-primary",
  success: "bg-emerald-500",
  error: "bg-rose-500",
};

export function Progress({
  value,
  variant = "default",
  showShimmer = true,
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const active = clamped > 0 && clamped < 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full",
        variantTrack[variant],
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          variantFill[variant],
          active && showShimmer && "animate-shimmer bg-[length:200%_100%]"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
