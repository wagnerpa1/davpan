"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ReportImage {
  id: string;
  image_url: string;
  order_index: number | null;
}

interface ReportGalleryProps {
  images: ReportImage[];
}

export function ReportGallery({ images }: ReportGalleryProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setSelectedIdx((prev) =>
          prev !== null ? Math.min(prev + 1, images.length - 1) : null,
        );
      } else if (e.key === "ArrowLeft") {
        setSelectedIdx((prev) =>
          prev !== null ? Math.max(prev - 1, 0) : null,
        );
      } else if (e.key === "Escape") {
        setSelectedIdx(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedIdx, images.length]);

  const nextImage = useCallback(() => {
    setSelectedIdx((prev) =>
      prev !== null ? (prev + 1) % images.length : null,
    );
  }, [images.length]);

  const prevImage = useCallback(() => {
    setSelectedIdx((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null,
    );
  }, [images.length]);

  // Handle swipe on mobile
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();
      else prevImage();
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Galerie
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {images.length} Bilder
        </p>
      </div>

      {/* Carousel */}
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className="relative flex-none w-[70%] sm:w-[35%] lg:w-[22%] aspect-[4/3] snap-start rounded-2xl overflow-hidden cursor-pointer group border border-slate-100 bg-slate-50 transition-all hover:border-jdav-green/40"
            aria-label={`Bild ${idx + 1} vergroessern`}
          >
            <Image
              src={img.image_url}
              alt={`Tour Bild ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 35vw, 22vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Lightbox / Enlarged View */}
      {selectedIdx !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setSelectedIdx(null)}
            className="absolute top-6 right-6 p-3 text-white/50 hover:text-white transition-colors z-10 bg-white/5 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between px-6 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="p-3 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-sm"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="p-3 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all pointer-events-auto backdrop-blur-sm"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div
            className="relative w-full h-full max-w-6xl max-h-[85vh] p-4 flex flex-col items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-full h-full animate-in zoom-in-95 duration-300 transition-all">
              <Image
                src={images[selectedIdx].image_url}
                alt={`Full size view ${selectedIdx + 1}`}
                fill
                priority
                className="object-contain"
                sizes="100vw"
              />
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={cn(
                    "h-1.5 transition-all duration-300 rounded-full",
                    selectedIdx === i
                      ? "w-8 bg-jdav-green"
                      : "w-1.5 bg-white/20 hover:bg-white/40",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
