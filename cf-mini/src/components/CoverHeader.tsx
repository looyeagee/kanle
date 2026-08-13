import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { resolveAvatar } from "@/lib/avatar";

export default function CoverHeader({ user }: { user: User }) {
  const [scrollY, setScrollY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    ready.current = true;
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
          {user.cover ? (
            <img
              src={user.cover}
              alt="朋友圈封面"
              className="h-full w-full object-cover"
              style={isDesktop ? { transform: `translate3d(0, ${parallax}px, 0) scale(1.25)` } : undefined}
            />
          ) : (
            <div className="cover-fallback h-full w-full" />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 mx-auto max-w-[600px] px-4 sm:px-5 md:px-6">
          <div className="flex items-end justify-end gap-3 pb-1">
            <span className="mb-1 text-lg font-medium text-white drop-shadow md:text-xl">{user.nickname}</span>
            <div className="relative h-[56px] w-[56px] shrink-0 translate-y-[42%] overflow-hidden rounded-[5px] sm:h-[60px] sm:w-[60px] md:h-[64px] md:w-[64px]">
              <img src={avatarSrc} alt={user.nickname} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[600px] justify-end px-4 pb-2 pt-6 text-xs text-wechat-time sm:px-5 sm:pt-7 md:px-6 md:pb-3 md:pt-8">
        <span className="max-w-[80%] truncate text-right">{user.bio}</span>
      </div>
    </header>
  );
}
