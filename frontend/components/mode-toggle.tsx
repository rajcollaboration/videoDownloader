"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: only render theme-aware UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      data-testid="theme-toggle"
      variant="secondary"
      size="sm"
      onClick={() => setTheme(nextTheme)}
      aria-label="Toggle color theme"
    >
      {mounted && resolvedTheme === "dark" ? (
        <SunMedium className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
