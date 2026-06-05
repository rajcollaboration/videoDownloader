"use client";

import type { KeyboardEvent } from "react";
import { ArrowRight, Clipboard, Link2, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supportedPlatformsHint } from "@/lib/supported-platforms";

interface InputBoxProps {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onPaste: () => void;
  onSubmit: () => void;
  onClear: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function InputBox({
  value,
  isLoading,
  onChange,
  onPaste,
  onSubmit,
  onClear,
  onKeyDown,
}: InputBoxProps) {
  return (
    <div className="space-y-3">
      {/* Input + buttons row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* URL input */}
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="video-url-input"
            placeholder="Paste video link here…"
            className="h-14 rounded-2xl border-border/70 pl-11 pr-10 text-sm shadow-sm transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 md:text-base"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Video URL input"
          />
          {value && (
            <button
              type="button"
              aria-label="Clear URL"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-14 flex-1 rounded-2xl sm:flex-none sm:w-14"
            onClick={onPaste}
            aria-label="Paste from clipboard"
            disabled={isLoading}
            title="Paste from clipboard"
          >
            <Clipboard className="h-4 w-4 shrink-0" />
            <span className="ml-2 sm:hidden">Paste</span>
          </Button>

          <Button
            type="button"
            data-testid="fetch-formats-button"
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 text-white shadow-glow transition-all duration-300 hover:opacity-90 disabled:opacity-50 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Fetching…</span>
              </>
            ) : (
              <>
                <span>Get Formats</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground">
        Supports {supportedPlatformsHint} ·{" "}
        <span className="font-semibold text-rose-500/90 dark:text-rose-400">
          YouTube disabled
        </span>{" "}
        · public content only · Press{" "}
        <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">
          Enter
        </kbd>{" "}
        to fetch
      </p>
    </div>
  );
}
