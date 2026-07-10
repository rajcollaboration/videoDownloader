import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";

import "@/app/globals.css";
import { Footer } from "@/components/footer";
import { GoogleAdSense } from "@/components/google-adsense";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { getGoogleSiteVerificationCode, siteConfig } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Free Instagram & Facebook Video Downloader`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: [
    "Instagram Reel downloader",
    "Facebook video downloader",
    "free video downloader",
    "online video downloader",
    "Instagram video download",
    "MP3 audio extractor",
    "ClipFetch"
  ],
  authors: [{ name: "ClipFetch" }],
  creator: "ClipFetch",
  openGraph: {
    title: `${siteConfig.name} — Free Instagram & Facebook Video Downloader`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — Free Instagram & Facebook Video Downloader`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Free Instagram & Facebook Video Downloader`,
    description: siteConfig.description,
    images: [`${siteConfig.url}/og-image.svg`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  alternates: {
    canonical: siteConfig.url
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const googleVerification = getGoogleSiteVerificationCode();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {googleVerification ? (
         <meta name="google-site-verification" content="ZoI06Mp6xjwbpTc3Rfr58Ck7Rg0kF1aYjaLq7V2L3Dc" />
        ) : null}
        <meta name="google-adsense-account" content="ca-pub-1909886494208349"></meta>
      </head>
      <body className={manrope.variable}>
        <GoogleAdSense />
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            {/* ─── Header ─────────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
              <div className="container-shell flex h-16 items-center justify-between gap-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white text-sm font-bold shadow-glow">
                    CF
                  </span>
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-base font-extrabold tracking-tight text-transparent">
                    ClipFetch
                  </span>
                </Link>

                {/* Nav */}
                <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                  <Link href="/#features" className="hover:text-foreground transition">
                    Features
                  </Link>
                  <Link href="/#how-it-works" className="hover:text-foreground transition">
                    How it works
                  </Link>
                  <Link href="/blog" className="hover:text-foreground transition">
                    Blog
                  </Link>
                  <Link href="/studio" className="hover:text-foreground transition">
                    Studio
                  </Link>
                  <Link href="/admin/blog" className="hover:text-foreground transition">
                    Admin
                  </Link>
                </nav>

                {/* Right */}
                <div className="flex items-center gap-3">
                  <ModeToggle />
                  <Link
                    href="/#downloader"
                    className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition sm:block"
                  >
                    Try Free
                  </Link>
                  <MobileNav />
                </div>
              </div>
            </header>

            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
