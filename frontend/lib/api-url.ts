import { siteConfig } from "@/lib/site";

/**
 * API base URL when the UI is on a dev port (direct Next.js) or via Nginx (:80/:443).
 * Dev ports map API to the host's `/api` (nginx on port 80).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}/api`;
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
