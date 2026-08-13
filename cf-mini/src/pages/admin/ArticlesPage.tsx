import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";

export default function ArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  const load = () => {
    api<{ data: Post[] }>("/posts?type=article&page=1&limit=50")
      .then((json) => setPosts(json.data))
      .catch(() => {});
  };

  useEffect(load, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">文章</h1>
        <Link to="/admin/articles/new" className="rounded-lg bg-adm-primary px-3 py-1.5 text-sm text-adm-primary-text">
          写文章
        </Link>
      </div>
      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="flex items-start justify-between gap-3 rounded-xl bg-adm-card p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{post.title || "无标题"}</p>
              <p className="mt-1 text-xs text-adm-text-secondary">
                {post.category ? `${post.category} · ` : ""}
                {formatRelativeTime(post.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 text-xs">
              <Link to={`/admin/articles/${post.id}`} className="text-wechat-nickname">
                编辑
              </Link>
              <button
                type="button"
                className="text-adm-danger"
                onClick={async () => {
                  if (!confirm("删除这篇文章？")) return;
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
