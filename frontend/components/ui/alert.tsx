"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "success" | "error" | "info";

const alertStyles: Record<AlertVariant, { icon: ReactNode; border: string; background: string; title: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    border: "border-emerald-300/50",
    background: "bg-emerald-500/10 ring-1 ring-emerald-500/10",
    title: "text-emerald-900 dark:text-emerald-100",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
    border: "border-rose-300/50",
    background: "bg-rose-500/10 ring-1 ring-rose-500/10",
    title: "text-rose-900 dark:text-rose-100",
  },
  info: {
    icon: <Info className="h-5 w-5 text-primary" />,
    border: "border-primary/40",
    background: "bg-primary/10 ring-1 ring-primary/10",
    title: "text-primary",
  },
};

interface AlertProps {
  title: string;
  description: string;
  variant?: AlertVariant;
  onClose: () => void;
}

export function Alert({ title, description, variant = "info", onClose }: AlertProps) {
  const styles = alertStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "rounded-[1.75rem] border p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl",
        styles.border,
        styles.background
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{styles.icon}</div>
        <div className="min-w-0">
          <p className={cn("font-semibold text-base leading-tight", styles.title)}>{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="ml-auto rounded-full p-2 text-muted-foreground transition hover:bg-white/15 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
