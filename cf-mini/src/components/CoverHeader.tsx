import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { resolveAvatar } from "@/lib/avatar";

function bindImageLoad(el: HTMLImageElement | null, onReady: () => void) {
  if (!el) return;
  if (el.complete && el.naturalWidth > 0) queueMicrotask(onReady);
}

export default function CoverHeader({ user, loading = false }: { user: User; loading?: boolean }) {
  const [scrollY, setScrollY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const root = document.getElementById("scroll-root");
    const onScroll = () => setScrollY(Math.max(root?.scrollTop || 0, window.scrollY || 0));
    window.addEventListener("scroll", onScroll, { passive: true });
    root?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root?.removeEventListener("scroll", onScroll);
    };
  }, [isDesktop]);

  const avatarSrc = resolveAvatar(user.avatar, user.email || "", 200);
  const parallax = isDesktop ? Math.min(scrollY * 0.3, 40) : 0;

  return (
    <header className="w-full" data-cover-header>
      <div className="relative h-[335px] w-full sm:h-[300px] md:h-[340px]">
        <div className="absolute inset-0 overflow-hidden bg-wechat-bubble md:rounded-t-2xl">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-wechat-surface" />
          ) : user.cover ? (
            <img
              key={user.cover}
              src={user.cover}
              alt="朋友圈封面"
              ref={(el) => bindImageLoad(el, () => setCoverLoaded(true))}
              onLoad={() => setCoverLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-500 ${coverLoaded ? "opacity-100" : "opacity-0"}`}
              style={isDesktop ? { transform: `translate3d(0, ${parallax}px, 0) scale(1.25)` } : undefined}
            />
          ) : (
            <div className="cover-fallback h-full w-full" />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto max-w-[600px] px-4 sm:px-5 md:px-6">
          <div className="flex items-end justify-end gap-3 pb-1">
            {loading ? (
              <span className="mb-1 h-6 w-20 animate-pulse rounded bg-white/30" />
            ) : (
              <span className="mb-1 text-lg font-medium text-white drop-shadow md:text-xl">{user.nickname}</span>
            )}
            <div className="relative h-[56px] w-[56px] shrink-0 translate-y-[42%] overflow-hidden rounded-[5px] bg-wechat-bubble sm:h-[60px] sm:w-[60px] md:h-[64px] md:w-[64px]">
              {loading ? (
                <div className="h-full w-full animate-pulse bg-wechat-surface" />
              ) : (
                <img
                  key={avatarSrc}
                  src={avatarSrc}
                  alt={user.nickname}
                  ref={(el) => bindImageLoad(el, () => setAvatarLoaded(true))}
                  onLoad={() => setAvatarLoaded(true)}
                  className={`h-full w-full object-cover transition-opacity duration-500 ${avatarLoaded ? "opacity-100" : "opacity-0"}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[600px] justify-end px-4 pb-2 pt-6 text-xs text-wechat-time sm:px-5 sm:pt-7 md:px-6 md:pb-3 md:pt-8">
        {loading ? (
          <span className="h-3 w-28 animate-pulse rounded bg-wechat-bubble" />
        ) : user.bio ? (
          <span className="max-w-[80%] truncate text-right">{user.bio}</span>
        ) : null}
      </div>
    </header>
  );
}
