interface AdsenseSlotProps {
  label: string;
  orientation?: "horizontal" | "vertical";
}

export function AdsenseSlot({
  label,
  orientation = "horizontal"
}: AdsenseSlotProps) {
  return (
    <aside
      data-testid={`ads-slot-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`card-surface border-dashed p-4 text-sm text-muted-foreground ${
        orientation === "vertical" ? "min-h-72" : ""
      }`}
      aria-label={`${label} ad placement`}
    >
      <p className="font-semibold text-foreground">AdSense Slot</p>
      <p className="mt-1">{label}</p>
      <p className="mt-2 text-xs">
        Replace this placeholder with your responsive Google AdSense unit.
      </p>
    </aside>
  );
}
