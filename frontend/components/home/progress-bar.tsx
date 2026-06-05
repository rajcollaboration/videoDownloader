"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type ProgressBarVariant = "default" | "success" | "error";

interface ProgressBarProps {
  value: number;
  statusLabel?: string;
  variant?: ProgressBarVariant;
  className?: string;
}

const BAR_VARIANTS: Record<ProgressBarVariant, string> = {
  default: "from-primary to-secondary",
  success: "from-emerald-500 to-teal-500",
  error: "from-rose-500 to-orange-500",
};

export function ProgressBar({
  value,
  statusLabel,
  variant = "default",
  className,
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{statusLabel ?? "Processing"}</span>
        <span className="tabular-nums">{safeValue}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeValue}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-300",
            BAR_VARIANTS[variant]
          )}
        />
      </div>
    </div>
  );
}
