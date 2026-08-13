import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadFile } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import type { Post } from "@/lib/types";

export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    api<Post>(`/posts/${id}`).then((p) => {
      setTitle(p.title || "");
      setExcerpt(p.excerpt || "");
      setCover(p.cover || "");
      setCategory(p.category || "");
      setContent(p.content || "");
    }).catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [id, isNew]);

  const save = async () => {
    if (!title.trim()) {
      setError("请填写标题");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        type: "article" as const,
        title: title.trim(),
        cover,
        category: category.trim(),
        content,
        excerpt:
          excerpt.trim() ||
          content.replace(/[#>*_`\-\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 160),
        images: [],
        video: null,
      };
      if (isNew) {
        const created = await api<Post>("/posts", { method: "POST", body: JSON.stringify(body) });
        navigate(`/articles/${created.id}`);
      } else {
        await api(`/posts/${id}`, { method: "PUT", body: JSON.stringify(body) });
        navigate(`/articles/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{isNew ? "写文章" : "编辑文章"}</h1>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-lg outline-none"
      />
      <label className="block">
        <span className="mb-1.5 block text-sm text-adm-text-secondary">朋友圈节选</span>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value.slice(0, 160))}
          placeholder="显示在朋友圈文章卡片里，留空则从正文自动截取"
          rows={3}
          className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-sm outline-none"
        />
        <span className="mt-1 block text-right text-xs text-adm-text-secondary">{excerpt.length}/160</span>
      </label>
      <div className="flex gap-3">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="分类（选填）"
          className="flex-1 rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-sm outline-none"
        />
        <label className="cursor-pointer rounded-xl border border-adm-border px-3 py-2 text-sm text-adm-text-secondary">
          {cover ? "更换封面" : "上传封面"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const res = await uploadFile("/upload", file);
              if (res.url) setCover(res.url);
            }}
          />
        </label>
      </div>
      {cover && <img src={cover} alt="" className="h-36 w-full rounded-xl object-cover" />}
      <div className="flex gap-2 text-sm">
        <button type="button" className={!preview ? "text-wechat-nickname" : "text-adm-text-secondary"} onClick={() => setPreview(false)}>
          编辑
        </button>
        <button type="button" className={preview ? "text-wechat-nickname" : "text-adm-text-secondary"} onClick={() => setPreview(true)}>
          预览
        </button>
      </div>
      {preview ? (
        <div className="rich-content min-h-[280px] rounded-xl border border-adm-border bg-adm-card px-4 py-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Markdown 正文"
          rows={16}
          className="w-full rounded-xl border border-adm-border bg-adm-input px-3 py-2 font-mono text-sm outline-none"
        />
      )}
      {error && <p className="text-sm text-adm-danger">{error}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-adm-primary px-4 py-2 text-sm text-adm-primary-text disabled:opacity-50"
      >
        {saving ? "保存中..." : "发布"}
      </button>
    </div>
  );
}
