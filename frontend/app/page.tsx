import {
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  Lock,
  Music4,
  Sparkles,
  Zap,
  Link2,
  Star,
  Film,
} from "lucide-react";
import { FeatureCard } from "@/components/home/feature-card";
import { HeroSection } from "@/components/home/hero-section";
import { AdsenseSlot } from "@/components/adsense-slot";
import { SchemaMarkup } from "@/components/schema-markup";
import { faqs, platformPages } from "@/lib/site";

/* ─── Platform SVG icons ───────────────────────────────────── */
function InstagramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current text-[#E1306C]">
      <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.7 1.7 4.8 4.8.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.1-1.6 4.7-4.8 4.8-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.2-.1-4.7-1.7-4.8-4.8C2.3 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.3 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zm0-2.2C8.7 0 8.3 0 7.1.1 2.9.3.3 2.9.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.2 2.8 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.2-.2 6.8-2.8 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9C23.7 2.9 21.1.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 12 5.8zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.9a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z" />
    </svg>
  );
}

function FacebookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current text-[#1877F2]">
      <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2V8h-1.5c-1.5 0-1.9.9-1.9 1.8v2.3h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z" />
    </svg>
  );
}

function TikTokIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current text-foreground">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

function LinkedInIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="fill-current text-[#0A66C2]">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

const features = [
  {
    icon: Download,
    title: "High Quality Downloads",
    description: "Choose from multiple resolutions up to 4K. Download original quality with no compression.",
    accent: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Zap,
    title: "Lightning Fast Processing",
    description: "Async processing queue handles files rapidly. Multiple downloads never slow each other down.",
    accent: "from-yellow-500/20 to-yellow-500/5",
  },
  {
    icon: Globe,
    title: "Multi-Platform Support",
    description: "TikTok, LinkedIn, Instagram, Facebook, X, Vimeo, Reddit, and more — one tool for every platform (except YouTube).",
    accent: "from-green-500/20 to-green-500/5",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "No accounts required. Your URLs and downloads are never stored beyond job completion.",
    accent: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Music4,
    title: "Audio Extraction",
    description: "Extract high-quality MP3 audio from any supported video with a single click.",
    accent: "from-pink-500/20 to-pink-500/5",
  },
  {
    icon: Film,
    title: "Real-Time Progress",
    description: "Live download speed, ETA, and progress tracking keep you informed every step of the way.",
    accent: "from-orange-500/20 to-orange-500/5",
  },
];

const steps = [
  {
    n: "01",
    icon: Link2,
    title: "Paste your URL",
    description: "Copy a public link from TikTok, LinkedIn, Instagram, Facebook, X, or other supported sites.",
  },
  {
    n: "02",
    icon: Star,
    title: "Choose your quality",
    description: "Pick your preferred resolution or select audio-only. Preview the thumbnail and duration first.",
  },
  {
    n: "03",
    icon: Download,
    title: "Download instantly",
    description: "We process your file in the background and trigger the download directly to your device.",
  },
];

const platforms = [
  {
    icon: <TikTokIcon />,
    label: "TikTok",
    href: "/#downloader",
    color: "border-foreground/15 hover:border-foreground/30 hover:bg-foreground/5",
    badge: "Videos & clips",
  },
  {
    icon: <LinkedInIcon />,
    label: "LinkedIn",
    href: "/#downloader",
    color: "border-[#0A66C2]/20 hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/5",
    badge: "Posts & videos",
  },
  {
    icon: <InstagramIcon />,
    label: "Instagram",
    href: "/download-instagram-reels",
    color: "border-[#E1306C]/20 hover:border-[#E1306C]/40 hover:bg-[#E1306C]/5",
    badge: "Reels & Posts",
  },
  {
    icon: <FacebookIcon />,
    label: "Facebook",
    href: "/download-facebook-video",
    color: "border-[#1877F2]/20 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/5",
    badge: "Videos & Stories",
  },
];

export default function HomePage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <SchemaMarkup data={faqSchema} />

      {/* ── Hero ── */}
      <HeroSection />

      <section className="container-shell py-6">
        <AdsenseSlot label="Top Sidebar Banner" />
      </section>

      {/* ── Supported Platforms ── */}
      <section className="container-shell py-14">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Supported Platforms
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {platforms.map(({ icon, label, href, color, badge }) => (
            <a
              key={label}
              href={href}
              className={`group flex items-center gap-4 rounded-2xl border bg-card/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft ${color}`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-card/90">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{label}</p>
                <p className="text-xs text-muted-foreground">{badge}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="border-y border-border/50 bg-muted/30 py-16 md:py-24"
      >
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Why ClipFetch
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                nothing you don&apos;t
              </span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">
              Built for speed, privacy, and simplicity — fully responsive across phone, tablet, and desktop.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon, title, description, accent }) => (
              <FeatureCard
                key={title}
                icon={icon}
                title={title}
                description={description}
                accent={accent}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Three steps to your file
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ n, icon: Icon, title, description }, idx) => (
              <div key={n} className="relative flex flex-col items-start">
                {/* Connector line (desktop only) */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-[calc(100%+12px)] top-6 hidden h-px w-6 border-t border-dashed border-border md:block" />
                )}
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-glow">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Step {n}
                </div>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Guides ── */}
      <section className="border-y border-border/50 bg-muted/30 py-16 md:py-24">
        <div className="container-shell">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Platform Guides
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                Built for every platform
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
                Platform-specific pages with practical tips and clean UX patterns.
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Core Web Vitals Ready
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformPages.map((page) => (
              <a
                key={page.slug}
                href={`/${page.slug}`}
                className="group rounded-2xl border bg-card/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {page.platform}
                </p>
                <h3 className="mt-1 text-lg font-bold transition group-hover:text-primary">
                  {page.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {page.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Learn more{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 md:py-24">
        <div className="container-shell max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group overflow-hidden rounded-2xl border bg-card/80 transition-all duration-300 open:border-primary/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold select-none">
                  <span>{faq.question}</span>
                  <span className="ml-auto shrink-0 flex h-7 w-7 items-center justify-center rounded-full border bg-muted text-muted-foreground transition-all duration-300 group-open:rotate-45 group-open:border-primary/40 group-open:bg-primary/10 group-open:text-primary">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                      <path
                        d="M8 1v14M1 8h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="border-t border-border/50 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEO content block ── */}
      <section className="border-t border-border/50 bg-muted/30 py-14 md:py-16">
        <div className="container-shell max-w-4xl">
          <h2 className="text-xl font-bold md:text-2xl">
            The fastest way to download Instagram and Facebook videos online
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              ClipFetch is a free online video downloader supporting Instagram
              Reels and Facebook videos. Paste any public video URL, pick your
              preferred quality, and download it instantly — no software
              installation required.
            </p>
            <p>
              Looking for an <strong>Instagram Reel downloader</strong>? ClipFetch
              handles Reels and posts with multi-format support. Extract audio as
              MP3 from any supported video with a single click.
            </p>
            <p>
              Our async processing queue ensures downloads complete reliably. Each
              job is tracked in real-time with live speed and ETA, and a direct
              browser download fires as soon as your file is ready.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {[
              "Instagram Reel downloader",
              "Facebook video downloader",
              "Instagram video downloader",
              "Online video downloader",
              "Free video downloader",
              "MP3 audio extractor",
            ].map((kw) => (
              <span
                key={kw}
                className="rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 md:py-20">
        <div className="container-shell">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-secondary px-6 py-12 text-center text-white shadow-glow sm:px-10 md:px-16 md:py-16">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-secondary/30 blur-2xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />

            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">
                Get Started
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
                Start downloading — it&apos;s free
              </h2>
              <p className="mt-4 text-white/75 md:text-lg">
                No account. No limit. No catch.
              </p>

              <div className="mt-8 flex justify-center">
                <a
                  href="#downloader"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-primary shadow-lg transition-all duration-300 hover:bg-white/90 hover:shadow-xl active:scale-95"
                >
                  Try ClipFetch now
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-white/70">
                {[
                  "No sign-up required",
                  "Downloads to your device",
                  "Instagram & Facebook",
                  "Audio extraction included",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-white/50" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
