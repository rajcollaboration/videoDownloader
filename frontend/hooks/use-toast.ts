"use client";

import { useCallback, useState } from "react";
import type { ToastItem } from "@/components/ui/toast";

const AUTO_DISMISS_MS = 5000;

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
      const id = crypto.randomUUID();
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
