import { useCallback, useEffect, useRef, useState } from "react";
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
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = images[index];
  const src = getImageSrc(current);
  const video = getVideoSrc(current);
  const loadingLive = !!video && playLive && !videoReady;

  const startLive = useCallback(() => {
    setVideoReady(false);
    setPlayLive(true);
  }, []);

  const stopLive = useCallback(() => {
    setVideoReady(false);
    setPlayLive(false);
  }, []);

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
    setVideoReady(false);
  }, [index, video]);

  useEffect(() => {
    if (!playLive || !videoRef.current) return;
    const el = videoRef.current;
    el.currentTime = 0;
    el.muted = muted;
    el.play().catch(() => {
      el.muted = true;
      setMuted(true);
      el.play().catch(() => {});
    });
  }, [playLive, index]);

  useEffect(() => {
    if (!playLive || !video) return;
    const ua = navigator.userAgent;
    if (/iphone/i.test(ua) && /micromessenger/i.test(ua)) {
      const timer = setTimeout(() => setVideoReady(true), 600);
      return () => clearTimeout(timer);
    }
  }, [playLive, index, video]);

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
          if (video && !playLive) startLive();
        }}
      >
        <img
          src={src}
          alt=""
          className={`max-h-[90vh] max-w-[92vw] object-contain transition-opacity duration-300 ${
            playLive && videoReady ? "opacity-0" : "opacity-100"
          } ${video ? "cursor-pointer" : ""}`}
        />
        {playLive && video && (
          <video
            ref={videoRef}
            key={video}
            src={video}
            playsInline
            muted={muted}
            preload="auto"
            controls={false}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
              videoReady ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            onEnded={stopLive}
          />
        )}
        {video && (
          <LiveBadge
            hidden={playLive && videoReady}
            label={loadingLive ? "实况加载中" : "实况"}
            className="left-3 top-3 px-3 py-1.5 text-xs"
            onClick={() => {
              if (playLive) stopLive();
              else startLive();
            }}
          />
        )}
        {video && playLive && videoReady && (
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
