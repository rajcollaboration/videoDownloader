"use client";

import { useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type ParallaxLoaderVariant = "resolve" | "download";

interface ParallaxLoaderProps {
  title: string;
  subtitle?: string;
  variant?: ParallaxLoaderVariant;
  progress?: number;
  className?: string;
}

const orbs = [
  { size: 120, x: "12%", y: "18%", delay: 0, color: "from-primary/40 to-primary/5" },
  { size: 88, x: "78%", y: "12%", delay: 0.4, color: "from-secondary/35 to-emerald-500/5" },
  { size: 64, x: "68%", y: "72%", delay: 0.8, color: "from-sky-400/30 to-transparent" },
  { size: 96, x: "8%", y: "68%", delay: 1.1, color: "from-violet-500/25 to-transparent" },
];

export function ParallaxLoader({
  title,
  subtitle,
  variant = "resolve",
  progress,
  className,
}: ParallaxLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 22 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 22 });

  const layer1X = useTransform(smoothX, [-1, 1], [-18, 18]);
  const layer1Y = useTransform(smoothY, [-1, 1], [-14, 14]);
  const layer2X = useTransform(smoothX, [-1, 1], [-32, 32]);
  const layer2Y = useTransform(smoothY, [-1, 1], [-24, 24]);
  const layer3X = useTransform(smoothX, [-1, 1], [-48, 48]);
  const layer3Y = useTransform(smoothY, [-1, 1], [-36, 36]);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY]
  );

  const handleLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const clampedProgress =
    progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      data-testid="parallax-loader"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-mesh p-8 dark:bg-mesh-dark",
        className
      )}
    >
      {/* Parallax background layers */}
      <motion.div
        style={{ x: layer3X, y: layer3Y }}
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,hsl(var(--secondary)/0.1),transparent_45%)]" />
      </motion.div>

      <motion.div
        style={{ x: layer2X, y: layer2Y }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        {orbs.map((orb) => (
          <motion.div
            key={`${orb.x}-${orb.y}`}
            className={cn(
              "absolute rounded-full bg-gradient-to-br blur-2xl",
              orb.color
            )}
            style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y }}
            animate={{ y: [0, -12, 0], scale: [1, 1.06, 1] }}
            transition={{
              duration: 4 + orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            }}
          />
        ))}
      </motion.div>

      {/* Center content */}
      <motion.div
        style={{ x: layer1X, y: layer1Y }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-dashed border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {variant === "download" ? (
              <Download className="h-7 w-7" />
            ) : (
              <Sparkles className="h-7 w-7" />
            )}
          </motion.div>
        </div>

        <motion.h3
          className="text-lg font-bold tracking-tight sm:text-xl"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          {title}
        </motion.h3>
        {subtitle ? (
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
        ) : null}

        {clampedProgress !== undefined ? (
          <div className="mt-6 w-full max-w-xs">
            <div className="mb-2 flex justify-between text-xs font-semibold tabular-nums text-muted-foreground">
              <span>Progress</span>
              <span>{clampedProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-shimmer"
                initial={{ width: 0 }}
                animate={{ width: `${clampedProgress}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-primary/70"
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Depth grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />
    </div>
  );
}
