import Link from "next/link";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-muted/30">
        <div className="container-shell flex h-12 items-center gap-6 text-sm">
          <Link href="/studio" className="font-semibold text-primary">Studio</Link>
          <Link href="/studio/upload" className="text-muted-foreground hover:text-foreground transition">Upload</Link>
          <Link href="/studio" className="text-muted-foreground hover:text-foreground transition">My Videos</Link>
          <Link href="/studio/jobs" className="text-muted-foreground hover:text-foreground transition">Jobs</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
