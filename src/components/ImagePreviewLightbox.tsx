import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCw,
  Image as ImageIcon,
} from "lucide-react";

export interface ImagePreviewLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const ImagePreviewLightbox: React.FC<ImagePreviewLightboxProps> = ({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title,
  subtitle,
}) => {
  // Normalize images
  const validImages = React.useMemo(() => {
    return images.filter((img) => typeof img === "string" && img.trim() !== "");
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Sync index on open or initialIndex change
  useEffect(() => {
    if (isOpen) {
      const idx = Math.max(0, Math.min(initialIndex, validImages.length - 1));
      setCurrentIndex(idx);
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex, validImages.length]);

  const handlePrev = useCallback(() => {
    if (validImages.length <= 1) return;
    setZoomLevel(1);
    setRotation(0);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
  }, [validImages.length]);

  const handleNext = useCallback(() => {
    if (validImages.length <= 1) return;
    setZoomLevel(1);
    setRotation(0);
    setCurrentIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
  }, [validImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((z) => Math.min(z + 0.5, 3));
      } else if (e.key === "-") {
        setZoomLevel((z) => Math.max(z - 0.5, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel > 1) return; // Don't swipe when zoomed
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (zoomLevel > 1) return;
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (zoomLevel > 1) return;
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const currentImg = validImages[currentIndex];
    if (!currentImg) return;

    if (currentImg.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = currentImg;
      a.download = `preview-${currentIndex + 1}.png`;
      a.click();
    } else {
      window.open(currentImg, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen || validImages.length === 0) return null;

  const currentImage = validImages[currentIndex];

  return (
    <div
      id="lightbox-container"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white backdrop-blur-md select-none transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Bar Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col max-w-[65%] sm:max-w-[80%]">
          {title && (
            <h3 className="text-sm sm:text-base font-semibold text-white truncate drop-shadow-sm">
              {title}
            </h3>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {validImages.length > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono font-medium">
                {currentIndex + 1} / {validImages.length}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom In / Out */}
          <button
            id="lightbox-btn-zoom"
            type="button"
            onClick={toggleZoom}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title={zoomLevel > 1 ? "Perkecil (Reset Zoom)" : "Perbesar (Zoom)"}
          >
            {zoomLevel > 1 ? (
              <ZoomOut className="w-5 h-5" />
            ) : (
              <ZoomIn className="w-5 h-5" />
            )}
          </button>

          {/* Rotate */}
          <button
            id="lightbox-btn-rotate"
            type="button"
            onClick={handleRotate}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer hidden sm:block"
            title="Putar 90°"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* Download / Open */}
          <button
            id="lightbox-btn-download"
            type="button"
            onClick={handleDownload}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Unduh / Buka Gambar Asli"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Close Button */}
          <button
            id="lightbox-btn-close"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-rose-600/80 rounded-full transition-colors ml-1 cursor-pointer"
            title="Tutup (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden px-4 py-2"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Prev Arrow */}
        {validImages.length > 1 && (
          <button
            id="lightbox-btn-prev"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-xs transition-all cursor-pointer transform -translate-y-1/2 top-1/2"
            title="Gambar Sebelumnya (←)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Image Display */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            cursor: zoomLevel > 1 ? "zoom-out" : "zoom-in",
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
        >
          <img
            id="lightbox-active-image"
            src={currentImage}
            alt={title || `Foto ${currentIndex + 1}`}
            className="max-h-[75vh] sm:max-h-[80vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-all select-none"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        </div>

        {/* Next Arrow */}
        {validImages.length > 1 && (
          <button
            id="lightbox-btn-next"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-xs transition-all cursor-pointer transform -translate-y-1/2 top-1/2"
            title="Gambar Selanjutnya (→)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {validImages.length > 1 && (
        <div
          className="px-4 py-3 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 px-2 scrollbar-none">
            {validImages.map((img, idx) => (
              <button
                key={idx}
                id={`lightbox-thumb-${idx}`}
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                  setCurrentIndex(idx);
                }}
                className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/30"
                    : "border-transparent opacity-50 hover:opacity-100 hover:border-white/40"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-[8px] text-center font-bold uppercase tracking-wider py-0.5 text-white">
                    Cover
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Gunakan tombol panah keyboard ← → atau klik thumbnail untuk berpindah foto
          </span>
        </div>
      )}
    </div>
  );
};
