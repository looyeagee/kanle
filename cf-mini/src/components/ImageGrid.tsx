import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import ImageViewer from "./ImageViewer";
import LiveBadge from "./LiveBadge";
import type { PostImage } from "@/lib/types";
import { getImageSrc, getVideoSrc, isLivePhoto } from "@/lib/post-image";

function FadeImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

const stopProp = (e: ReactMouseEvent | ReactTouchEvent) => e.stopPropagation();

export default function ImageGrid({ images }: { images: PostImage[] }) {
  const [index, setIndex] = useState(-1);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [singleRatio, setSingleRatio] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [videoMounted, setVideoMounted] = useState(-1);
  const [videoOpacity, setVideoOpacity] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openViewer = useCallback((i: number, el: HTMLElement) => {
    setOriginRect(el.getBoundingClientRect());
    setIndex(i);
  }, []);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const playVideo = useCallback((i: number) => {
    setVideoOpacity(false);
    setVideoMounted(i);
    setPlayingIndex(i);
  }, []);

  const stopVideo = useCallback(() => {
    setVideoOpacity(false);
    setPlayingIndex(-1);
    setVideoMounted(-1);
  }, []);

  useEffect(() => {
    if (playingIndex >= 0 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [playingIndex, videoMounted]);

  const startPress = useCallback(
    (i: number, hasVideo: boolean) => {
      if (!hasVideo || isDesktop) return;
      longPressedRef.current = false;
      clearPressTimer();
      pressTimerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        playVideo(i);
      }, 500);
    },
    [clearPressTimer, playVideo, isDesktop]
  );

  const endPress = useCallback(() => {
    clearPressTimer();
    if (longPressedRef.current && playingIndex >= 0) {
      stopVideo();
      longPressedRef.current = false;
    }
    if (isDesktop && playingIndex >= 0) stopVideo();
  }, [clearPressTimer, playingIndex, stopVideo, isDesktop]);

  const handleTouchStart = useCallback(
    (i: number, hasVideo: boolean, e: ReactTouchEvent<HTMLDivElement>) => {
      const t = e.touches[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
      startPress(i, hasVideo);
    },
    [startPress]
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      if (Math.abs(t.clientX - touchStartRef.current.x) > 10 || Math.abs(t.clientY - touchStartRef.current.y) > 10) {
        endPress();
        touchStartRef.current = null;
      }
    },
    [endPress]
  );

  const handleClick = useCallback(
    (i: number, el: HTMLElement) => {
      if (longPressedRef.current) {
        longPressedRef.current = false;
        return;
      }
      if (isDesktop && playingIndex === i) stopVideo();
      openViewer(i, el);
    },
    [isDesktop, playingIndex, stopVideo, openViewer]
  );

  useEffect(() => {
    if (images.length !== 1 || !images[0]) {
      setSingleRatio(null);
      return;
    }
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth && probe.naturalHeight) {
        setSingleRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.onerror = () => {
      if (!cancelled) setSingleRatio(4 / 3);
    };
    probe.src = getImageSrc(images[0]);
    return () => {
      cancelled = true;
    };
  }, [images]);

  useEffect(() => () => {
    clearPressTimer();
  }, [clearPressTimer]);

  const count = images.length;
  if (count === 0) return null;
  const display = images.slice(0, 9);
  const cols = display.length === 2 || display.length === 4 ? 2 : 3;

  const liveLayer = (i: number, img: PostImage) => {
    const src = getImageSrc(img);
    const video = getVideoSrc(img);
    const live = isLivePhoto(img);
    const playing = playingIndex === i && videoOpacity;
    const videoHere = videoMounted === i;
    return (
      <>
        <button
          type="button"
          className={`absolute inset-0 h-full w-full cursor-zoom-in ${playing ? "opacity-0" : "opacity-100"}`}
        >
          <FadeImage src={src} alt="朋友圈图片" className="object-cover" />
        </button>
        {videoHere && video && (
          <video
            ref={videoRef}
            src={video}
            muted={muted}
            playsInline
            preload="auto"
            onCanPlay={() => setVideoOpacity(true)}
            onPlaying={() => setVideoOpacity(true)}
            onEnded={stopVideo}
            className={`absolute inset-0 h-full w-full object-cover ${videoOpacity ? "opacity-100" : "opacity-0"}`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(i, e.currentTarget.parentElement!);
            }}
          />
        )}
        {live && <LiveBadge hidden={playing} />}
        {playing && (
          <button
            type="button"
            onMouseDown={stopProp}
            onTouchStart={stopProp}
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="absolute bottom-1.5 right-1.5 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </>
    );
  };

  if (display.length === 1) {
    const ratio = singleRatio ?? 4 / 3;
    const isLandscape = ratio >= 1;
    const widthValue = isLandscape
      ? "min(100%, var(--single-img-max, 280px))"
      : `min(100%, calc(var(--single-img-height, 240px) * ${ratio}))`;
    const img = display[0];
    const video = getVideoSrc(img);
    return (
      <>
        <div className="mt-2" style={{ width: widthValue }}>
          <div
            className="group relative block w-full overflow-hidden rounded bg-wechat-bubble select-none"
            style={{ paddingBottom: `${100 / ratio}%` }}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => handleTouchStart(0, !!video, e)}
            onTouchEnd={() => { touchStartRef.current = null; endPress(); }}
            onTouchMove={handleTouchMove}
            onMouseEnter={() => { if (isDesktop && !!video) playVideo(0); }}
            onMouseLeave={endPress}
            onClick={(e) => handleClick(0, e.currentTarget)}
          >
            {liveLayer(0, img)}
          </div>
        </div>
        {index >= 0 && (
          <ImageViewer images={images} initialIndex={index} originRect={originRect} onClose={() => { setIndex(-1); setOriginRect(null); }} />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={`mt-2 grid gap-[4px] ${cols === 2 ? "max-w-[min(60vw,240px)] md:max-w-[min(50vw,300px)]" : "max-w-[min(72vw,270px)] md:max-w-[min(64vw,340px)]"}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {display.map((img, i) => {
          const video = getVideoSrc(img);
          return (
            <div
              key={i}
              className="group relative w-full overflow-hidden rounded-sm bg-wechat-bubble select-none"
              style={{ paddingBottom: "100%" }}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => handleTouchStart(i, !!video, e)}
              onTouchEnd={() => { touchStartRef.current = null; endPress(); }}
              onTouchMove={handleTouchMove}
              onMouseEnter={() => { if (isDesktop && !!video) playVideo(i); }}
              onMouseLeave={endPress}
              onClick={(e) => handleClick(i, e.currentTarget)}
            >
              {liveLayer(i, img)}
            </div>
          );
        })}
      </div>
      {index >= 0 && (
        <ImageViewer images={images} initialIndex={index} originRect={originRect} onClose={() => { setIndex(-1); setOriginRect(null); }} />
      )}
    </>
  );
}
