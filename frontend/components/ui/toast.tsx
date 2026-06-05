"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  variant?: ToastVariant;
}

interface ToastProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { border: string; icon: React.ReactNode }> = {
  default: {
    border: "border-border",
    icon: null,
  },
  success: {
    border: "border-emerald-500/40",
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />,
  },
  error: {
    border: "border-rose-500/40",
    icon: <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />,
  },
  info: {
    border: "border-primary/40",
    icon: <Info className="h-5 w-5 shrink-0 text-primary" />,
  },
};

export function Toast({ items, onDismiss }: ToastProps) {
  return (
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {items.map((item) => {
          const { border, icon } = variantStyles[item.variant ?? "default"];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`rounded-2xl border bg-card/95 p-4 shadow-soft backdrop-blur ${border}`}
            >
              <div className="flex items-start gap-3">
                {icon && <div className="mt-0.5">{icon}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(item.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-full p-1 hover:bg-foreground/5 transition"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
