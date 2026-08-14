import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookText } from "lucide-react";
import type { Post } from "@/lib/types";
import { api } from "@/lib/api";
import { readBootstrapArticles } from "@/lib/bootstrap";
import { formatArticleDate } from "@/lib/time";

const bootArticles = readBootstrapArticles();

export default function ArticleListSidebar() {
  const [articles, setArticles] = useState<Post[]>(bootArticles?.articles ?? []);
  const [loading, setLoading] = useState(!bootArticles);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(bootArticles?.hasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const currentId = location.pathname.split("/").pop() || "";
  const PAGE_SIZE = 5;

  useEffect(() => {
    if (bootArticles) return;
    api<{ data: Post[] }>(`/posts?type=article&page=1&limit=${PAGE_SIZE}`)
      .then((data) => {
        setArticles(data.data || []);
        setHasMore((data.data || []).length >= PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.key]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    api<{ data: Post[] }>(`/posts?type=article&page=${nextPage}&limit=${PAGE_SIZE}`)
      .then((data) => {
        const items = data.data || [];
        setArticles((prev) => [...prev, ...items]);
        setPage(nextPage);
        setHasMore(items.length >= PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    if (window.innerWidth < 1024) return;
    const scrollRoot = document.getElementById("scroll-root");
    const sidebar = sidebarScrollRef.current;
    if (!scrollRoot || !sidebar) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        sidebar.scrollTop = scrollRoot.scrollTop;
      });
    };
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [loading]);

  if (!loading && articles.length === 0) return null;

  return (
    <aside className="hidden lg:block lg:fixed lg:top-6 lg:right-[calc(50%+324px)] lg:w-[220px] xl:w-[260px]">
      <div ref={sidebarScrollRef} className="no-scrollbar space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="rounded-2xl bg-wechat-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-wechat-text">
            <BookText className="h-4 w-4 text-wechat-nickname" />
            文章列表
          </h3>
          {loading ? (
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-2 py-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-wechat-bubble" />
                  <div className="mt-1.5 h-2.5 w-full animate-pulse rounded bg-wechat-bubble" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {articles.map((article) => {
                const isActive = article.id === currentId;
                return (
                  <li key={article.id}>
                    <Link
                      to={`/articles/${article.id}`}
                      className={`group flex gap-2 rounded-lg p-1.5 transition-colors ${isActive ? "bg-wechat-nickname/10" : "hover:bg-wechat-hover dark:hover:bg-white/5"}`}
                    >
                      {article.cover && (
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-wechat-bubble">
                          <img src={article.cover} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`line-clamp-2 text-[13px] font-medium leading-snug ${isActive ? "text-wechat-nickname" : "text-wechat-text group-hover:text-wechat-nickname"}`}>
                          {article.title || "(无标题)"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] text-wechat-time/70">{formatArticleDate(article.createdAt)}</span>
                          {article.category && (
                            <span className="rounded bg-wechat-bubble px-1 py-0.5 text-[10px] text-wechat-time dark:bg-white/5">
                              {article.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 w-full rounded-lg py-2 text-center text-xs text-wechat-nickname hover:bg-wechat-hover disabled:opacity-50"
            >
              {loadingMore ? "加载中..." : "加载更多"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
