import Image from "next/image";
import { Download, Music4, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoMetadata } from "@/services/api";

interface VideoCardProps {
  data: VideoMetadata;
  imageSrc: string;
  onImageError: () => void;
  onStartDownload: (formatId: string, audioOnly?: boolean) => void;
}

function isProxiedThumbnail(src: string): boolean {
  return (
    /\/v1\/videos\/[^/]+\/thumbnail/.test(src) ||
    src.includes("/v1/videos/thumbnail") ||
    (src.startsWith("http") && src.includes("/api/"))
  );
}

export function VideoCard({
  data,
  imageSrc,
  onImageError,
  onStartDownload,
}: VideoCardProps) {
  const proxied = isProxiedThumbnail(imageSrc);

  const handleImgError = () => {
    // #region agent log
    fetch("http://127.0.0.1:7391/ingest/461347e9-e042-4fd8-8a6d-adbcfa48d9c6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "7b0c8d" },
      body: JSON.stringify({
        sessionId: "7b0c8d",
        hypothesisId: "C",
        location: "video-card.tsx:onError",
        message: "thumbnail failed to load",
        data: { imageSrc, proxied },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    onImageError();
  };

  return (
    <div className="rounded-2xl border bg-card/90 p-4 shadow-lg md:p-6">
      <div className="grid gap-5 md:grid-cols-[280px,1fr]">
        <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
          {proxied ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={data.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={handleImgError}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={data.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 280px"
              onError={handleImgError}
            />
          )}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {data.platform} • {data.duration}
          </p>
          <h2 className="text-lg font-bold leading-tight md:text-2xl">{data.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.formats.map((format, idx) => (
              <div
                key={format.id}
                className="rounded-lg border bg-card/70 p-3 transition-all duration-300 hover:border-primary/40 hover:bg-card"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">{format.label}</p>
                  {idx === 0 && !format.audioOnly ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Star className="h-3 w-3" />
                      Best
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format.filesizeMb ? `${format.filesizeMb} MB` : "Unknown size"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="h-10 rounded-lg"
                    onClick={() => onStartDownload(format.id)}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Video
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 rounded-lg"
                    onClick={() => onStartDownload(format.id, true)}
                  >
                    <Music4 className="mr-1 h-3.5 w-3.5" />
                    Audio
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
