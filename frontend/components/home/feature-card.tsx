import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = "from-primary/20 to-primary/5",
}: FeatureCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card/80 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-glow">
      {/* Icon */}
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}
      >
        <Icon className="h-6 w-6 text-primary" />
      </div>

      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </article>
  );
}
