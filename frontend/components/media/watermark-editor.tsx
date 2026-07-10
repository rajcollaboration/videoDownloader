"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2, Move, Type, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type WatermarkConfig } from "@/services/media-api";

interface WatermarkEditorProps {
  mediaUrl: string;
  isImage: boolean;
  videoWidth?: number;
  videoHeight?: number;
  videoDuration?: number;
  onApply: (watermarks: WatermarkConfig[]) => void;
  loading?: boolean;
}

interface LocalWatermark extends WatermarkConfig {
  id: string;
  // Temporary UI scale/position parameters for preview mapping
  width: number;
  height: number;
}

export function WatermarkEditor({
  mediaUrl,
  isImage,
  videoWidth = 1280,
  videoHeight = 720,
  videoDuration = 60,
  onApply,
  loading = false,
}: WatermarkEditorProps) {
  const [watermarks, setWatermarks] = useState<LocalWatermark[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedWatermark = watermarks.find((w) => w.id === selectedId);

  // Keep track of parent container aspect ratio mapping
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const updateContainerSize = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [watermarks]);

  const addTextWatermark = () => {
    const id = Math.random().toString(36).substring(7);
    const newWm: LocalWatermark = {
      id,
      type: "text",
      text: "Watermark {username}",
      position: "custom",
      x: 100,
      y: 100,
      width: 200,
      height: 60,
      opacity: 1.0,
      rotation: 0,
      margin: 10,
      padding: 5,
      fontSize: 24,
      fontColor: "#ffffff",
      outlineColor: "#000000",
      outlineWidth: 2,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      startTime: 0,
      endTime: videoDuration,
    };
    setWatermarks([...watermarks, newWm]);
    setSelectedId(id);
  };

  const addLogoWatermark = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Call API to upload logo
    try {
      const { uploadLogo } = await import("@/services/media-api");
      const { logoPath } = await uploadLogo(file);
      
      const id = Math.random().toString(36).substring(7);
      const newWm: LocalWatermark = {
        id,
        type: "logo",
        logoPath,
        position: "custom",
        x: 150,
        y: 150,
        width: 120,
        height: 120,
        opacity: 0.8,
        scale: 0.15,
        rotation: 0,
        margin: 10,
        padding: 0,
        fontSize: 12,
        fontColor: "#ffffff",
        outlineWidth: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        startTime: 0,
        endTime: videoDuration,
      };
      setWatermarks([...watermarks, newWm]);
      setSelectedId(id);
    } catch (err) {
      alert("Failed to upload logo: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const deleteWatermark = (id: string) => {
    setWatermarks(watermarks.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelected = (updates: Partial<LocalWatermark>) => {
    setWatermarks(
      watermarks.map((w) => (w.id === selectedId ? { ...w, ...updates } : w))
    );
  };

  // Convert custom coordinate mapping from preview to natural dimensions
  const handleDrag = (e: React.MouseEvent, wm: LocalWatermark) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = wm.x ?? 0;
    const initialY = wm.y ?? 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Scale up coords to match actual media resolution
      const scaleX = videoWidth / rect.width;
      const scaleY = videoHeight / rect.height;

      let newX = initialX + deltaX * scaleX;
      let newY = initialY + deltaY * scaleY;

      // Bound within media dimensions
      newX = Math.max(0, Math.min(videoWidth - wm.width, newX));
      newY = Math.max(0, Math.min(videoHeight - wm.height, newY));

      setWatermarks((prev) =>
        prev.map((w) =>
          w.id === wm.id ? { ...w, x: Math.round(newX), y: Math.round(newY) } : w
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResize = (e: React.MouseEvent, wm: LocalWatermark) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = wm.width;
    const initialHeight = wm.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const scaleX = videoWidth / rect.width;
      const scaleY = videoHeight / rect.height;

      const newWidth = Math.max(20, initialWidth + deltaX * scaleX);
      const newHeight = Math.max(20, initialHeight + deltaY * scaleY);

      setWatermarks((prev) =>
        prev.map((w) =>
          w.id === wm.id
            ? {
                ...w,
                width: Math.round(newWidth),
                height: Math.round(newHeight),
                // Update proportional scale value for logos
                scale: w.type === "logo" ? Number((newWidth / videoWidth).toFixed(3)) : undefined,
              }
            : w
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleApply = () => {
    // Send final parameters
    onApply(
      watermarks.map((w) => ({
        type: w.type,
        text: w.text,
        logoPath: w.logoPath,
        position: w.position,
        x: w.x,
        y: w.y,
        opacity: w.opacity,
        scale: w.scale,
        rotation: w.rotation,
        margin: w.margin,
        padding: w.padding,
        fontName: w.fontName,
        fontSize: w.fontSize,
        fontColor: w.fontColor,
        outlineColor: w.outlineColor,
        outlineWidth: w.outlineWidth,
        shadowColor: w.shadowColor,
        shadowOffsetX: w.shadowOffsetX,
        shadowOffsetY: w.shadowOffsetY,
        startTime: w.startTime,
        endTime: w.endTime,
      }))
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Editor preview canvas */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Watermark Canvas
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={addTextWatermark}>
              <Type className="h-4 w-4 mr-1.5" /> Add Text
            </Button>
            <Button size="sm" variant="secondary" className="relative">
              <ImageIcon className="h-4 w-4 mr-1.5" /> Add Logo
              <input
                type="file"
                accept="image/*"
                onChange={addLogoWatermark}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative aspect-video w-full rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-2xl"
          onClick={() => setSelectedId(null)}
        >
          {/* Background Media */}
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" className="h-full w-full object-contain pointer-events-none" />
          ) : (
            <video src={mediaUrl} className="h-full w-full object-contain pointer-events-none" muted loop autoPlay />
          )}

          {/* Render Watermarks */}
          {watermarks.map((wm) => {
            const isSelected = wm.id === selectedId;

            // Map standard coords (e.g. 0-1280) to client preview coords
            const leftPercent = ((wm.x ?? 0) / videoWidth) * 100;
            const topPercent = ((wm.y ?? 0) / videoHeight) * 100;
            const widthPercent = (wm.width / videoWidth) * 100;
            const heightPercent = (wm.height / videoHeight) * 100;

            return (
              <div
                key={wm.id}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                  transform: `rotate(${wm.rotation}deg)`,
                  opacity: wm.opacity,
                  transition: "transform 0.1s ease-out",
                }}
                className={`absolute select-none cursor-move border flex items-center justify-center ${
                  isSelected ? "border-primary bg-primary/10 shadow-glow" : "border-white/40 bg-white/5 hover:border-white/80"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(wm.id);
                }}
                onMouseDown={(e) => handleDrag(e, wm)}
              >
                {/* Content */}
                {wm.type === "text" ? (
                  <div
                    style={{
                      color: wm.fontColor,
                      fontSize: `${(wm.fontSize * containerSize.width) / videoWidth}px`,
                      fontFamily: wm.fontName || "Arial",
                      textShadow: wm.shadowColor
                        ? `${wm.shadowOffsetX}px ${wm.shadowOffsetY}px 2px ${wm.shadowColor}`
                        : "none",
                      WebkitTextStroke: wm.outlineColor && wm.outlineWidth ? `${wm.outlineWidth}px ${wm.outlineColor}` : "none",
                      padding: `${wm.padding}px`,
                    }}
                    className="font-bold whitespace-nowrap overflow-hidden text-center"
                  >
                    {wm.text || "Watermark"}
                  </div>
                ) : (
                  <div className="text-white text-xs flex flex-col items-center">
                    <ImageIcon className="h-6 w-6 text-white/70" />
                    <span className="text-[10px] opacity-70">Logo watermark</span>
                  </div>
                )}

                {/* Resize Handle */}
                {isSelected && (
                  <div
                    onMouseDown={(e) => handleResize(e, wm)}
                    className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize bg-primary rounded-tl-md flex items-center justify-center"
                  />
                )}

                {/* Move Handle Icon */}
                {isSelected && (
                  <div className="absolute left-1 top-1 text-primary bg-black/75 p-0.5 rounded">
                    <Move className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Control panel / configuration sidebar */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <h3 className="font-bold text-lg">Settings</h3>

        {selectedWatermark ? (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
              <p className="font-medium text-capitalize mt-0.5">{selectedWatermark.type}</p>
            </div>

            {selectedWatermark.type === "text" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text</label>
                  <input
                    type="text"
                    value={selectedWatermark.text || ""}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter custom text..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Placeholders: {"{username}"}, {"{date}"}, {"{time}"}, {"{file_name}"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Family</label>
                  <select
                    value={selectedWatermark.fontName || "Arial"}
                    onChange={(e) => updateSelected({ fontName: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Size</label>
                    <input
                      type="number"
                      value={selectedWatermark.fontSize}
                      onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) || 12 })}
                      className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
                    <input
                      type="color"
                      value={selectedWatermark.fontColor}
                      onChange={(e) => updateSelected({ fontColor: e.target.value })}
                      className="w-full mt-1 h-9 rounded-lg border border-border bg-background p-1 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outline Width</label>
                    <input
                      type="number"
                      value={selectedWatermark.outlineWidth}
                      onChange={(e) => updateSelected({ outlineWidth: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outline Color</label>
                    <input
                      type="color"
                      value={selectedWatermark.outlineColor || "#000000"}
                      onChange={(e) => updateSelected({ outlineColor: e.target.value })}
                      className="w-full mt-1 h-9 rounded-lg border border-border bg-background p-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(selectedWatermark.opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={selectedWatermark.opacity}
                onChange={(e) => updateSelected({ opacity: parseFloat(e.target.value) })}
                className="w-full mt-1 accent-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                <span>Rotation</span>
                <span className="font-mono">{selectedWatermark.rotation}°</span>
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={selectedWatermark.rotation}
                onChange={(e) => updateSelected({ rotation: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 accent-primary"
              />
            </div>

            {!isImage && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={selectedWatermark.startTime}
                    onChange={(e) => updateSelected({ startTime: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={selectedWatermark.endTime}
                    onChange={(e) => updateSelected({ endTime: parseFloat(e.target.value) || videoDuration })}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => deleteWatermark(selectedWatermark.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Remove Watermark
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Click on any watermark in the canvas to configure it, or add a new one.
          </p>
        )}

        <hr className="border-border" />

        <Button
          onClick={handleApply}
          disabled={watermarks.length === 0 || loading}
          className="w-full font-bold shadow-glow"
        >
          {loading ? "Processing..." : "Apply Watermarks"}
        </Button>
      </div>
    </div>
  );
}
