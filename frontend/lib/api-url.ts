import { siteConfig } from "@/lib/site";

/**
 * API base URL that works when the UI is served on :3000 (direct Next.js)
 * or via Nginx on :80. Always targets the host's `/api` reverse proxy.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (port === "3000") {
      return `${protocol}//${hostname}/api`;
    }
    if (!port || port === "80" || port === "443") {
      return `${protocol}//${hostname}/api`;
    }
    return `${protocol}//${hostname}:${port}/api`;
  }
  if (process.env.INTERNAL_API_BASE_URL) {
    return process.env.INTERNAL_API_BASE_URL.replace(/\/$/, "");
  }
  return (siteConfig.apiBaseUrl ?? "http://localhost/api").replace(/\/$/, "");
}

/** Turn `/api/v1/...` or `https://...` into a fetchable absolute URL. */
export function resolveApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const origin = getApiBaseUrl().replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}

/** Build URL for an API route (path starts with `/v1/...`). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalized}`;
}
