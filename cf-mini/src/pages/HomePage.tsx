import { useEffect, useState } from "react";
import DesktopDecorations from "@/components/DesktopDecorations";
import TopBar from "@/components/TopBar";
import CoverHeader from "@/components/CoverHeader";
import PostList from "@/components/PostList";
import ArticleListSidebar from "@/components/ArticleListSidebar";
import FloatingActions from "@/components/FloatingActions";
import MomentEditor from "@/components/MomentEditor";
import { api } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import type { Post, User } from "@/lib/types";

export default function HomePage() {
  const [owner, setOwner] = useState<User>({
    id: "owner",
    nickname: "看了",
    avatar: "",
    cover: "",
    bio: "",
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);

  useEffect(() => {
    api<User>("/profile").then((p) => setOwner({ ...p, id: "owner" })).catch(() => {});
    api<{ data: Post[]; pagination: { hasMore: boolean } }>("/posts?page=1&limit=10")
      .then((json) => {
        setPosts(json.data);
        setHasMore(json.pagination.hasMore);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="md:pt-6">
        <div
          id="scroll-root"
          className="md:fixed md:top-6 md:left-[calc(50%-300px)] md:z-10 md:h-[calc(100vh-48px)] md:w-[600px] md:overflow-y-auto md:rounded-2xl md:bg-wechat-white md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <main className="relative w-full bg-wechat-white pb-8 md:pb-12">
            <TopBar />
            <CoverHeader user={owner} />
            <PostList
              initialPosts={posts}
              initialHasMore={hasMore}
              onEdit={getAdmin() ? (p) => setEditing(p) : undefined}
            />
            <footer className="px-6 py-8 text-center text-xs text-wechat-time">看了 · Cloudflare 缩小版</footer>
          </main>
        </div>
        <ArticleListSidebar />
      </div>
      <FloatingActions />
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-adm-card p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-adm-text">编辑动态</h2>
            <MomentEditor post={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
