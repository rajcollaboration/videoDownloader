"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime, type SearchResult } from "@/services/media-api";

interface AISearchPanelProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onPlaySegment: (start: number, end: number) => void;
  onGenerateClip: (start: number, end: number, title: string, query: string) => void;
  onRefineSelection: (start: number, end: number) => void;
  loading?: boolean;
}

const SUGGESTIONS = [
  "Show where testing was discussed",
  "Show all client complaints",
  "Show where budget was discussed",
  "Show where login issues were mentioned",
  "Show action items",
  "Show where deployment was discussed",
];

export function AISearchPanel({
  onSearch,
  onPlaySegment,
  onGenerateClip,
  onRefineSelection,
  loading,
}: AISearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await onSearch(searchQuery);
      setResults(data);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">AI Search</h3>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "Show where testing issues were discussed"'
          onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
        />
        <Button onClick={() => void handleSearch()} disabled={searching || loading}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); void handleSearch(s); }}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            {s}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium text-primary">
                  {formatTime(result.startTime)} – {formatTime(result.endTime)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(result.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => onPlaySegment(result.startTime, result.endTime)}>
                  Play Segment
                </Button>
                <Button
                  size="sm"
                  onClick={() => onGenerateClip(result.startTime, result.endTime, `Clip: ${query.slice(0, 30)}`, query)}
                  disabled={loading}
                >
                  Generate Clip
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onRefineSelection(result.startTime, result.endTime)}
                >
                  Refine Selection
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
