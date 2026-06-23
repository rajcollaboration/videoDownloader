"use client";

import { useEffect, useRef } from "react";

import { adsenseClient } from "@/lib/site";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdsenseSlotProps {
  label: string;
  orientation?: "horizontal" | "vertical";
  /** Optional AdSense unit id from AdSense → Ads → By ad unit */
  slotId?: string;
}

export function AdsenseSlot({
  label,
  orientation = "horizontal",
  slotId,
}: AdsenseSlotProps) {
  const pushed = useRef(false);
  const enabled =
    adsenseClient &&
    !adsenseClient.includes("xxxxxxxx") &&
    !adsenseClient.includes("xxxx");

  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const testId = `ads-slot-${label.toLowerCase().replace(/\s+/g, "-")}`;

  if (!enabled) {
    return (
      <aside
        data-testid={testId}
        className={`card-surface border-dashed p-4 text-sm text-muted-foreground ${
          orientation === "vertical" ? "min-h-72" : ""
        }`}
        aria-label={`${label} ad placement`}
      >
        <p className="font-semibold text-foreground">AdSense Slot</p>
        <p className="mt-1">{label}</p>
        <p className="mt-2 text-xs">Set NEXT_PUBLIC_ADSENSE_CLIENT in .env to enable ads.</p>
      </aside>
    );
  }

  return (
    <aside
      data-testid={testId}
      className={`overflow-hidden ${orientation === "vertical" ? "min-h-[250px]" : "min-h-[90px]"}`}
      aria-label={`${label} advertisement`}
    >
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={adsenseClient}
        {...(slotId ? { "data-ad-slot": slotId } : {})}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
