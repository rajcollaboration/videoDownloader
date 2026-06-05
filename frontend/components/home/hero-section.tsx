import { Download, Sparkles } from "lucide-react";
import { HeroDownloader } from "@/components/hero-downloader";

export function HeroSection() {
  return (
    <section
      id="downloader"
      className="relative overflow-hidden border-b border-border/50 bg-mesh dark:bg-mesh-dark py-14 md:py-24"
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-48 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="container-shell relative">
        {/* Top badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" />
            Free · No account · No limits
          </span>
        </div>

        {/* Headline */}
        <div className="mx-auto mt-6 max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-foreground">Download Any Video</span>
            <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Free &amp; Instantly
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Paste a TikTok, LinkedIn, Instagram, Facebook, or other supported link —
            choose your quality and save directly to your device. YouTube is disabled.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            { value: "15+", label: "Platforms" },
            { value: "4K", label: "Max Quality" },
            { value: "MP4 & MP3", label: "Formats" },
            { value: "100%", label: "Free" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-foreground sm:text-3xl">
                {value}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Downloader card */}
        <div className="mx-auto mt-10 max-w-4xl">
          <div className="rounded-3xl border border-primary/20 bg-card/90 p-4 shadow-glow backdrop-blur-sm sm:p-6 md:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
                <Download className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold">ClipFetch Downloader</span>
            </div>
            <HeroDownloader />
          </div>
        </div>
      </div>
    </section>
  );
}
