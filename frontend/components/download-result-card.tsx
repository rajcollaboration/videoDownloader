"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { VideoCard } from "@/components/home/video-card";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import type { VideoMetadata } from "@/services/api";

interface DownloadResultCardProps {
  data: VideoMetadata;
  onStartDownload: (formatId: string, audioOnly?: boolean) => void;
}

/** Short proxy URL by request id — avoids huge LinkedIn/CDN query strings in the browser. */
function toProxiedThumb(requestId: string): string {
  if (!requestId) return "/fallback.svg";
  const proxied = apiUrl(`/v1/videos/${requestId}/thumbnail`);
  return proxied;
}

export function DownloadResultCard({
  data,
  onStartDownload
}: DownloadResultCardProps) {
  const [imgSrc, setImgSrc] = useState(() => toProxiedThumb(data.requestId));
  const [copied, setCopied] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setImgSrc(toProxiedThumb(data.requestId));
  }, [data.thumbnailUrl, data.requestId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.sourceUrl || "");
      setCopied(true);
      pushToast("Copied!", "Video URL copied to clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("Error", "Unable to copy URL.", "error");
    }
  };

  return (
    <section className="space-y-3" data-testid="download-result-card">
      <div className="flex justify-end">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition hover:text-primary"
          title="Copy source URL"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
      <VideoCard
        data={data}
        imageSrc={imgSrc}
        onImageError={() => setImgSrc("/fallback.svg")}
        onStartDownload={onStartDownload}
      />
    </section>
  );
}
