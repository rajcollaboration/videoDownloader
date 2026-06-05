"use client";

import { useCallback, useState } from "react";
import type { ToastItem } from "@/components/ui/toast";

const AUTO_DISMISS_MS = 5000;

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert RNG bytes to UUID v4 format
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (
      title: string,
      description: string,
      variant: ToastItem["variant"] = "default"
    ) => {
      const id = generateId();
      setItems((current) => [...current, { id, title, description, variant }]);

      // Auto-dismiss after 5 s
      setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, AUTO_DISMISS_MS);
    },
    []
  );

  return { items, pushToast, dismissToast };
}
