import { useEffect, useState } from "react";
import MomentEditor from "@/components/MomentEditor";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";

export default function MomentsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null | "new">(null);

  const load = () => {
    api<{ data: Post[] }>("/posts?type=moment&page=1&limit=50")
      .then((json) => setPosts(json.data))
      .catch(() => {});
  };

  useEffect(load, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">朋友圈动态</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-adm-primary px-3 py-1.5 text-sm text-adm-primary-text"
        >
          发动态
        </button>
      </div>
      {editing !== null && (
        <div className="mb-6 rounded-2xl border border-adm-border bg-adm-card p-4">
          <MomentEditor
            post={editing === "new" ? null : editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="flex items-start justify-between gap-3 rounded-xl bg-adm-card p-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm">{post.content || "（无文字）"}</p>
              <p className="mt-1 text-xs text-adm-text-secondary">{formatRelativeTime(post.createdAt)}</p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs">
              <button type="button" className="text-wechat-nickname" onClick={() => setEditing(post)}>
                编辑
              </button>
              <button
                type="button"
                className="text-adm-danger"
                onClick={async () => {
                  if (!confirm("删除这条动态？")) return;
                  await api(`/posts/${post.id}`, { method: "DELETE" });
                  load();
                }}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
