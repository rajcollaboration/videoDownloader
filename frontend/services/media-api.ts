import { apiUrl } from "@/lib/api-url";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MediaVideo {
  id: string;
  title: string;
  description?: string | null;
  sourceType: string;
  sourceUrl?: string | null;
  status: string;
  durationSeconds?: number | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  thumbnailPath?: string | null;
  playbackUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number | null;
  speaker?: string | null;
}

export interface Transcript {
  id: string;
  videoId: string;
  fullText?: string | null;
  language?: string | null;
  confidence?: number | null;
  status: string;
  segments: TranscriptSegment[];
}

export interface Topic {
  id: string;
  title: string;
  summary?: string | null;
  startTime: number;
  endTime: number;
  confidence?: number | null;
  keyDecisions?: string[] | null;
  actionItems?: string[] | null;
  risks?: string[] | null;
  issuesRaised?: string[] | null;
}

export interface Clip {
  id: string;
  videoId: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  source: string;
  searchQuery?: string | null;
  status: string;
  progress: number;
  downloadUrl?: string | null;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  videoId?: string | null;
  clipId?: string | null;
  jobType: string;
  status: string;
  progress: number;
  message: string;
  errorDetail?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface SearchResult {
  startTime: number;
  endTime: number;
  confidence: number;
  summary: string;
  text?: string | null;
  chunkId?: string | null;
}

export interface VideoDetail extends MediaVideo {
  transcript?: Transcript | null;
  topics: Topic[];
  clips: Clip[];
  jobs: ProcessingJob[];
}

export interface MediaVideoList {
  videos: MediaVideo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("clipfetch_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function mediaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Request failed");
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json();
  return normalizeKeys(data) as T;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeKeys);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = normalizeKeys(value);
    }
    return result;
  }
  return obj;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function uploadVideo(file: File, title: string, description?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);
  return mediaRequest<MediaVideo>("/v1/media/upload", { method: "POST", body: formData });
}

export async function createVideoFromUrl(url: string, title?: string) {
  return mediaRequest<MediaVideo>("/v1/media/from-url", {
    method: "POST",
    body: JSON.stringify({ url, title }),
  });
}

export async function createVideoFromDownload(downloadJobId: string, title?: string) {
  return mediaRequest<MediaVideo>("/v1/media/from-download", {
    method: "POST",
    body: JSON.stringify({ download_job_id: downloadJobId, title }),
  });
}

export async function fetchMediaVideos(page = 1, status?: string) {
  const qs = new URLSearchParams({ page: String(page) });
  if (status) qs.set("status_filter", status);
  return mediaRequest<MediaVideoList>(`/v1/media/?${qs}`);
}

export async function fetchVideoDetail(videoId: string) {
  return mediaRequest<VideoDetail>(`/v1/media/${videoId}`);
}

export async function startVideoProcessing(videoId: string) {
  return mediaRequest<ProcessingJob>(`/v1/media/${videoId}/process`, { method: "POST" });
}

export async function searchVideo(videoId: string, query: string, topK = 5) {
  return mediaRequest<SearchResult[]>(`/v1/media/${videoId}/search`, {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK }),
  });
}

export async function createClip(
  videoId: string,
  payload: { title: string; startTime: number; endTime: number; source?: string; searchQuery?: string }
) {
  return mediaRequest<Clip>(`/v1/media/${videoId}/clips`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      source: payload.source ?? "manual",
      search_query: payload.searchQuery,
    }),
  });
}

export async function createClipsBatch(
  videoId: string,
  clips: { title: string; startTime: number; endTime: number }[]
) {
  return mediaRequest<Clip[]>(`/v1/media/${videoId}/clips/batch`, {
    method: "POST",
    body: JSON.stringify({
      clips: clips.map((c) => ({
        title: c.title,
        start_time: c.startTime,
        end_time: c.endTime,
        source: "manual",
      })),
    }),
  });
}

export async function fetchProcessingJobs(page = 1, videoId?: string) {
  const qs = new URLSearchParams({ page: String(page) });
  if (videoId) qs.set("video_id", videoId);
  return mediaRequest<ProcessingJob[]>(`/v1/jobs/?${qs}`);
}

export async function fetchProcessingJob(jobId: string) {
  return mediaRequest<ProcessingJob>(`/v1/jobs/${jobId}`);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeInput(input: string): number {
  const parts = input.split(":").map(Number);
  if (parts.some(isNaN)) throw new Error("Invalid time format");
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
