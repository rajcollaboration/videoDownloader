export const siteConfig = {
  name: "ClipFetch",
  description:
    "Free online video downloader for TikTok, LinkedIn, Instagram, Facebook, X, Vimeo, Reddit, and more. Fast processing, multi-quality downloads, and no sign-up required.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost/api"
};

/** Google AdSense publisher id (ca-pub-…) */
export const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

/** Google Search Console HTML meta tag verification code (build-time fallback). */
export const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";

/** Runtime verification code — set GOOGLE_SITE_VERIFICATION in .env (no rebuild). */
export function getGoogleSiteVerificationCode(): string {
  return (
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
    ""
  );
}

export const platformPages = [
  {
    slug: "download-facebook-video",
    title: "Facebook Video Downloader",
    description:
      "Download Facebook videos from supported public links with fast link parsing, multi-quality options, and mobile-friendly UI.",
    platform: "Facebook"
  },
  {
    slug: "download-instagram-reels",
    title: "Instagram Reels Downloader",
    description:
      "Download Instagram Reels and videos from supported public links with preview, quality selection, and audio extraction options.",
    platform: "Instagram"
  },
  {
    slug: "download-tiktok-video",
    title: "TikTok Video Downloader",
    description:
      "Download TikTok videos online for free. Save TikToks in high quality without watermarks on any device.",
    platform: "TikTok"
  },
  {
    slug: "download-linkedin-video",
    title: "LinkedIn Video Downloader",
    description:
      "Save LinkedIn videos and posts online. Extract high-quality MP4 professional video clips and tutorials.",
    platform: "LinkedIn"
  },
  {
    slug: "download-reddit-video",
    title: "Reddit Video Downloader",
    description:
      "Download Reddit videos with audio automatically merged. Fast, free, and works directly in your web browser.",
    platform: "Reddit"
  },
  {
    slug: "download-twitter-video",
    title: "Twitter (X) Video Downloader",
    description:
      "Save videos and GIFs from Twitter (X) posts. Fast processing, MP4 output, and no account creation required.",
    platform: "X"
  },
  {
    slug: "download-pinterest-video",
    title: "Pinterest Video Downloader",
    description:
      "Download Pinterest videos and story Pins. Save creative ideas and inspiration directly to your local storage.",
    platform: "Pinterest"
  },
  {
    slug: "download-vimeo-video",
    title: "Vimeo Video Downloader",
    description:
      "Extract and download public Vimeo videos in original high-definition formats with a single click.",
    platform: "Vimeo"
  }
] as const;

export const faqs = [
  {
    question: "Which platforms are supported?",
    answer:
      "ClipFetch supports TikTok, LinkedIn, Instagram, Facebook, X (Twitter), Vimeo, Reddit, Pinterest, Twitch, and many other public video links via yt-dlp. YouTube is intentionally disabled. Paste any supported public URL to get started."
  },
  {
    question: "Can I download private content?",
    answer:
      "No. The app is designed to reject private, restricted, or unsupported content and show a clear error message. Only public videos are accessible."
  },
  {
    question: "Is audio-only download supported?",
    answer:
      "Yes. Every supported video format includes an audio-only option that saves as an MP3 file directly to your downloads folder."
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes — ClipFetch is completely free. No account, no subscription, no hidden limits. Just paste a link and download."
  },
  {
    question: "How long are my files stored?",
    answer:
      "Downloaded files are automatically deleted from our servers one hour after they are ready. We store nothing long-term."
  },
  {
    question: "Is it legal to download these videos?",
    answer:
      "You should only download content you own or have explicit permission to download. Respect copyright, platform terms of service, and applicable local law."
  }
];

