/** Keep in sync with backend `supported_hosts.SUPPORTED_HOST_FRAGMENTS`. */

export const YOUTUBE_URL_PATTERN = /youtube\.com|youtu\.be/i;

export const SUPPORTED_URL_PATTERN =
  /instagram\.com|facebook\.com|fb\.watch|fb\.com|linkedin\.com|lnkd\.in|tiktok\.com|twitter\.com|x\.com|vimeo\.com|reddit\.com|redd\.it|pinterest\.com|pin\.it|twitch\.tv|dailymotion\.com|threads\.net|snapchat\.com|tumblr\.com|bilibili\.com|soundcloud\.com|vk\.com|rumble\.com/i;

export const supportedPlatformLabels = [
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "X",
  "Vimeo",
  "Reddit",
  "Pinterest",
  "Twitch",
] as const;

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_PATTERN.test(url);
}

export function isSupportedVideoUrl(url: string): boolean {
  return SUPPORTED_URL_PATTERN.test(url);
}

export const supportedPlatformsHint =
  "Instagram, Facebook, TikTok, LinkedIn, X, Vimeo, Reddit, Pinterest, Twitch & more";
