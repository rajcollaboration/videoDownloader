"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface ShareButtonsProps {
  url: string;
  title?: string;
  label?: string;
  className?: string;
}

export function ShareButtons({ url, title, label = "Share", className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const text = title ?? "Check this out";
  const enc = encodeURIComponent;

  const socials = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      className: "bg-[#25D366] hover:bg-[#20bc5a] text-white",
      icon: <WhatsAppIcon />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      className: "bg-[#1877F2] hover:bg-[#166fe5] text-white",
      icon: <FacebookIcon />,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`,
      className:
        "bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black",
      icon: <XIcon />,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      className: "bg-[#229ED9] hover:bg-[#1a8fc4] text-white",
      icon: <TelegramIcon />,
    },
  ];

  async function handleNativeShare() {
    try {
      await navigator.share({ url, title: text });
    } catch {
      // user cancelled or API unavailable
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className={className}>
      <p className="section-label mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {"share" in (typeof navigator !== "undefined" ? navigator : {}) && (
          <button
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        )}
        {socials.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              s.className
            )}
          >
            {s.icon}
            {s.label}
          </a>
        ))}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
