"use client";

import { useEffect } from "react";
import { adsenseClient } from "@/lib/site";

export function GoogleAdSense() {
  useEffect(() => {
    if (!adsenseClient || adsenseClient.includes("xxxxxxxx")) {
      return;
    }
    
    // Check if script already exists to prevent duplicate injection
    const existingScript = document.querySelector(`script[src*="adsbygoogle.js"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, []);

  return null;
}
