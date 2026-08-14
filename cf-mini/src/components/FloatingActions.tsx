import { useEffect, useRef, useState } from "react";
import { Moon, Sun, ArrowUp } from "lucide-react";
import { applyTheme, getTheme, toggleTheme } from "@/lib/theme";

export default function FloatingActions({ liftAboveBottomBar = false }: { liftAboveBottomBar?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [dark, setDark] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    applyTheme(getTheme());
    setDark(getTheme() === "dark");
  }, []);

  useEffect(() => {
    const root = document.getElementById("scroll-root");
    const onScroll = () => {
      const y = Math.max(root?.scrollTop || 0, window.scrollY || 0);
      if (y < 100) {
        setVisible(false);
        lastY.current = y;
        return;
      }
      if (y - lastY.current > 5) setVisible(true);
      else if (y - lastY.current < -5) setVisible(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    root?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root?.removeEventListener("scroll", onScroll);
    };
  }, []);

  const btnClass =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/70 text-black backdrop-blur-md shadow-sm hover:bg-white/90 dark:border-white/10 dark:bg-white/15 dark:text-white";

  return (
    <div
      className={`fixed right-3 z-40 flex flex-col items-center gap-2 md:right-6 transition-[opacity,transform] duration-300 ${
        liftAboveBottomBar
          ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-5"
          : "bottom-5"
      } ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <button
        type="button"
        className={btnClass}
        onClick={() => setDark(toggleTheme() === "dark")}
        aria-label="切换主题"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className={btnClass}
        onClick={() => {
          const root = document.getElementById("scroll-root");
          (root || window).scrollTo({ top: 0, behavior: "smooth" });
        }}
        aria-label="回到顶部"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
