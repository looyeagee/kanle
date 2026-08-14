import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ArticleTopBar() {
  const navigate = useNavigate();
  return (
    <header className="fixed left-1/2 z-50 w-full max-w-[600px] -translate-x-1/2 pointer-events-none top-0 md:top-6">
      <div className="topbar-surface-white pointer-events-auto flex h-12 w-full items-center justify-between px-4 sm:px-5 md:px-6 md:rounded-t-2xl">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/");
          }}
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 sm:-ml-1.5"
          aria-label="返回"
        >
          <ArrowLeft className="h-[22px] w-[22px]" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
