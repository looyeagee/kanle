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
import { emptyProfile, readBootstrapProfile } from "@/lib/bootstrap";
import { setDocumentTitle, siteTitleOf } from "@/lib/title";
import type { Post, User } from "@/lib/types";

const bootstrapped = readBootstrapProfile();

export default function HomePage() {
  const [owner, setOwner] = useState<User>(bootstrapped ?? emptyProfile());
  const [profileLoading, setProfileLoading] = useState(!bootstrapped);
  const [editing, setEditing] = useState<Post | null>(null);

  useEffect(() => {
    if (bootstrapped) {
      setProfileLoading(false);
      return;
    }
    api<User>("/profile")
      .then((p) => setOwner({ ...p, id: "owner" }))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    setDocumentTitle(siteTitleOf(owner));
  }, [owner, profileLoading]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="md:pt-6">
        <div
          id="scroll-root"
          className="md:fixed md:top-6 md:left-[calc(50%-300px)] md:z-10 md:h-[calc(100vh-48px)] md:w-[600px] md:overflow-y-auto md:rounded-2xl md:bg-wechat-white md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <main className="relative w-full bg-wechat-white pb-4 md:pb-6">
            <TopBar />
            <CoverHeader user={owner} loading={profileLoading} />
            <PostList
              initialPosts={[]}
              initialHasMore={false}
              onEdit={getAdmin() ? (p) => setEditing(p) : undefined}
            />
            <footer className="px-6 py-3 text-center text-xs text-wechat-time">
              powered by{" "}
              <a
                href="https://github.com/zilinnb/kanle"
                target="_blank"
                rel="noopener noreferrer"
                className="text-wechat-nickname hover:opacity-70"
              >
                zilinnb/kanle
              </a>
            </footer>
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
