import { useCallback, useEffect, useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { api } from "@/lib/api";
import PostCard from "./PostCard";

const PAGE_SIZE = 10;

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
  const sentinelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const json = await api<{ data: Post[]; pagination: { hasMore: boolean } }>("/posts?page=1&limit=" + PAGE_SIZE);
    setPosts(json.data);
    setPage(1);
    setHasMore(json.pagination.hasMore);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
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
