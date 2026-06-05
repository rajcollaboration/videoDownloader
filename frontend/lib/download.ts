import { resolveApiUrl } from "@/lib/api-url";

/**
 * Programmatically trigger a browser file download.
 * Uses fetch → Blob → object URL so it works reliably even when called
 * without a direct user gesture (e.g. from a useEffect after job completion).
 * Falls back to a direct <a> click if the fetch fails.
 */
export function triggerBrowserDownload(url: string, filename = "video.mp4"): void {
  const absoluteUrl = resolveApiUrl(url);
  fetch(absoluteUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Keep the object URL alive long enough for the browser to start the download
      setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
    })
    .catch(() => {
      // Fallback: let the browser handle it via Content-Disposition header
      const link = document.createElement("a");
      link.href = absoluteUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
}

/**
 * Derive a download filename from a URL path or job id.
 * e.g. "/api/v1/downloads/files/abc123.mp4" → "video-abc123.mp4"
 */
export function filenameFromPath(path: string, fallback = "video.mp4"): string {
  const segment = path.split("/").pop();
  if (!segment) return fallback;
  // If it already has an extension, use it; otherwise append .mp4
  return /\.\w{2,4}$/.test(segment) ? segment : `${segment}.mp4`;
}
