const links = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blog" },
];

const platforms = [
  { label: "Instagram", href: "/download-instagram-reels" },
  { label: "Facebook", href: "/download-facebook-video" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card/30">
      <div className="container-shell py-12">
        <div className="grid gap-10 md:grid-cols-[1fr,auto,auto]">
          {/* Brand */}
          <div className="max-w-xs">
            <p className="text-lg font-extrabold tracking-tight">ClipFetch</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Fast, free video downloads for supported public URLs. Built for
              speed, designed for everyone.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Download only content you own or have permission to use. Respect
              platform terms, copyright, and local law.
            </p>
          </div>

          {/* Supported Platforms */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Platforms
            </p>
            <ul className="mt-4 space-y-2">
              {platforms.map((p) => (
                <li key={p.href}>
                  <a
                    href={p.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Company
            </p>
            <ul className="mt-4 space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ClipFetch. All rights reserved.</p>
          <p>Cloudflare-ready · Core Web Vitals optimised · Ad-friendly layout</p>
        </div>
      </div>
    </footer>
  );
}
