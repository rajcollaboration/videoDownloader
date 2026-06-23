"use client";

import Script from "next/script";

import { adsenseClient } from "@/lib/site";

export function GoogleAdSense() {
  if (!adsenseClient || adsenseClient.includes("xxxxxxxx")) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
