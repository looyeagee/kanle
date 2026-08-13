import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { api } from "@/lib/api";
import PostCard from "./PostCard";

const PAGE_SIZE = 10;

function FeedSkeleton() {
  return (
    <div className="divide-y divide-wechat-divider">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 px-4 py-4 sm:px-5 md:px-6">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-[5px] bg-wechat-bubble md:h-11 md:w-11" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-4 w-20 animate-pulse rounded bg-wechat-bubble" />
            <div className="h-3.5 w-full animate-pulse rounded bg-wechat-bubble" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-wechat-bubble" />
            <div className="mt-2 h-[88px] w-[140px] animate-pulse rounded bg-wechat-bubble" />
            <div className="h-3 w-16 animate-pulse rounded bg-wechat-bubble" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PostList({
  initialPosts,
  initialHasMore,
  onEdit,
}: {
  initialPosts: Post[];
  initialHasMore: boolean;
  onEdit?: (post: Post) => void;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [booting, setBooting] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const json = await api<{ data: Post[]; pagination: { hasMore: boolean } }>("/posts?page=1&limit=" + PAGE_SIZE);
    setPosts(json.data);
    setPage(1);
    setHasMore(json.pagination.hasMore);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setBooting(false));
    const onPublished = () => refresh().catch(() => {});
    window.addEventListener("post-published", onPublished);
    return () => window.removeEventListener("post-published", onPublished);
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const json = await api<{ data: Post[]; pagination: { hasMore: boolean } }>(`/posts?page=${next}&limit=${PAGE_SIZE}`);
      setPosts((prev) => [...prev, ...json.data]);
      setPage(next);
      setHasMore(json.pagination.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条内容？")) return;
    await api(`/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  if (booting) return <FeedSkeleton />;

  return (
    <div className="divide-y divide-wechat-divider">
      {posts.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          index={i}
          onDelete={onEdit ? () => handleDelete(post.id) : undefined}
          onEdit={onEdit && post.type === "moment" ? () => onEdit(post) : undefined}
        />
      ))}
      <div ref={sentinelRef} className="h-8" />
      {loadingMore && <p className="py-4 text-center text-sm text-wechat-time">加载中...</p>}
      {!hasMore && posts.length > 0 && <p className="py-6 text-center text-sm text-wechat-time">没有更多了</p>}
      {posts.length === 0 && <p className="py-12 text-center text-sm text-wechat-time">还没有内容</p>}
    </div>
  );
}
