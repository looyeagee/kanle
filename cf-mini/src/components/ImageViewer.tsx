import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import type { PostImage } from "@/lib/types";
import { getImageSrc, getVideoSrc } from "@/lib/post-image";
import LiveBadge from "./LiveBadge";

interface ImageViewerProps {
  images: PostImage[];
  initialIndex: number;
  originRect: DOMRect | null;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [playLive, setPlayLive] = useState(true);
  const [muted, setMuted] = useState(true);
  const current = images[index];
  const src = getImageSrc(current);
  const video = getVideoSrc(current);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);

  useEffect(() => {
    setPlayLive(!!video);
  }, [index, video]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92" onClick={onClose}>
      <button type="button" className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white" onClick={onClose} aria-label="关闭">
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && index > 0 && (
        <button
          type="button"
          className="absolute left-3 z-10 rounded-full bg-white/10 p-2 text-white"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1); }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {images.length > 1 && index < images.length - 1 && (
        <button
          type="button"
          className="absolute right-3 z-10 rounded-full bg-white/10 p-2 text-white"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1); }}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <div
        className="relative max-h-[90vh] max-w-[92vw]"
        onClick={(e) => {
          e.stopPropagation();
          if (video && !playLive) setPlayLive(true);
        }}
      >
        {playLive && video ? (
          <video src={video} autoPlay playsInline muted={muted} controls={false} className="max-h-[90vh] max-w-[92vw] object-contain" onEnded={() => setPlayLive(false)} />
        ) : (
          <img src={src} alt="" className={`max-h-[90vh] max-w-[92vw] object-contain ${video ? "cursor-pointer" : ""}`} />
        )}
        {video && (
          <LiveBadge
            hidden={playLive}
            className="left-3 top-3 px-3 py-1.5 text-xs"
            onClick={() => {
              if (!playLive) setPlayLive(true);
            }}
          />
        )}
        {video && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-3 right-3 rounded-full bg-black/55 p-2 text-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
