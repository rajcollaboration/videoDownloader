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
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface VideoDetail extends MediaVideo {
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

export interface WatermarkConfig {
  type: "text" | "logo";
  text?: string;
  logoPath?: string;
  position: string;
  x?: number;
  y?: number;
  opacity: number;
  scale?: number;
  rotation: number;
  margin: number;
  padding: number;
  fontName?: string;
  fontSize: number;
  fontColor: string;
  outlineColor?: string;
  outlineWidth: number;
  shadowColor?: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  startTime?: number;
  endTime?: number;
}

export async function uploadLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return mediaRequest<{ logoPath: string }>("/v1/media/watermark/logo", { method: "POST", body: formData });
}

export async function applyWatermark(videoId: string, title: string, watermarks: WatermarkConfig[]) {
  const watermarksMapped = watermarks.map(w => ({
    type: w.type,
    text: w.text,
    logo_path: w.logoPath,
    position: w.position,
    x: w.x,
    y: w.y,
    opacity: w.opacity,
    scale: w.scale,
    rotation: w.rotation,
    margin: w.margin,
    padding: w.padding,
    font_name: w.fontName,
    font_size: w.fontSize,
    font_color: w.fontColor,
    outline_color: w.outlineColor,
    outline_width: w.outlineWidth,
    shadow_color: w.shadowColor,
    shadow_offset_x: w.shadowOffsetX,
    shadow_offset_y: w.shadowOffsetY,
    start_time: w.startTime,
    end_time: w.endTime
  }));
  return mediaRequest<Clip>(`/v1/media/${videoId}/watermark`, {
    method: "POST",
    body: JSON.stringify({ title, watermarks: watermarksMapped }),
  });
}

export async function applyWatermarkToClip(clipId: string, title: string, watermarks: WatermarkConfig[]) {
  const watermarksMapped = watermarks.map(w => ({
    type: w.type,
    text: w.text,
    logo_path: w.logoPath,
    position: w.position,
    x: w.x,
    y: w.y,
    opacity: w.opacity,
    scale: w.scale,
    rotation: w.rotation,
    margin: w.margin,
    padding: w.padding,
    font_name: w.fontName,
    font_size: w.fontSize,
    font_color: w.fontColor,
    outline_color: w.outlineColor,
    outline_width: w.outlineWidth,
    shadow_color: w.shadowColor,
    shadow_offset_x: w.shadowOffsetX,
    shadow_offset_y: w.shadowOffsetY,
    start_time: w.startTime,
    end_time: w.endTime
  }));
  return mediaRequest<Clip>(`/v1/media/clips/${clipId}/watermark`, {
    method: "POST",
    body: JSON.stringify({ title, watermarks: watermarksMapped }),
  });
}

export async function applyWatermarkBatch(videoIds: string[], watermarks: WatermarkConfig[]) {
  const watermarksMapped = watermarks.map(w => ({
    type: w.type,
    text: w.text,
    logo_path: w.logoPath,
    position: w.position,
    x: w.x,
    y: w.y,
    opacity: w.opacity,
    scale: w.scale,
    rotation: w.rotation,
    margin: w.margin,
    padding: w.padding,
    font_name: w.fontName,
    font_size: w.fontSize,
    font_color: w.fontColor,
    outline_color: w.outlineColor,
    outline_width: w.outlineWidth,
    shadow_color: w.shadowColor,
    shadow_offset_x: w.shadowOffsetX,
    shadow_offset_y: w.shadowOffsetY,
    start_time: w.startTime,
    end_time: w.endTime
  }));
  return mediaRequest<Clip[]>("/v1/media/watermark/batch", {
    method: "POST",
    body: JSON.stringify({ video_ids: videoIds, watermarks: watermarksMapped }),
  });
}

export interface ConvertPayload {
  title: string;
  format: string;
  qualityPreset: string;
  resolution?: string;
  fps?: number;
  bitrate?: string;
  codec?: string;
}

export async function convertVideo(videoId: string, payload: ConvertPayload) {
  return mediaRequest<Clip>(`/v1/media/${videoId}/convert`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      format: payload.format,
      quality_preset: payload.qualityPreset,
      resolution: payload.resolution,
      fps: payload.fps,
      bitrate: payload.bitrate,
      codec: payload.codec
    }),
  });
}

export interface ExtractAudioPayload {
  title: string;
  format: string;
  bitrate?: string;
  preserveMetadata?: boolean;
}

export async function extractAudio(videoId: string, payload: ExtractAudioPayload) {
  return mediaRequest<Clip>(`/v1/media/${videoId}/extract-audio`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      format: payload.format,
      bitrate: payload.bitrate,
      preserve_metadata: payload.preserveMetadata ?? true
    }),
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
