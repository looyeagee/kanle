import { useEffect, useState } from "react";
import { ImagePlus, Trash2, Video } from "lucide-react";
import type { Post, PostImage, PostVideo } from "@/lib/types";
import { api, uploadFile } from "@/lib/api";
import { getImageSrc, getVideoSrc, isLivePhoto } from "@/lib/post-image";

export default function MomentEditor({
  post,
  onSaved,
  onCancel,
}: {
  post?: Post | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(post?.content || "");
  const [images, setImages] = useState<PostImage[]>(post?.images || []);
  const [video, setVideo] = useState<PostVideo | null>(post?.video || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(post?.content || "");
    setImages(post?.images || []);
    setVideo(post?.video || null);
  }, [post]);

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    for (const file of Array.from(files).slice(0, 9 - images.length)) {
      try {
        if (file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) {
          const res = await uploadFile("/upload/motion-photo", file);
          if (res.src) {
            const src = res.src;
            setImages((prev) => [...prev, res.video ? { src, video: res.video } : src]);
            continue;
          }
        }
        const res = await uploadFile("/upload", file);
        if (res.url) {
          const url = res.url;
          setImages((prev) => [...prev, url]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败");
      }
    }
  };

  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      const res = await uploadFile("/upload/video", file);
      if (res.url) {
        setVideo({ url: res.url, source: "upload" });
        setImages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
  };

  const save = async () => {
    if (!content.trim() && images.length === 0 && !video) {
      setError("写点什么，或加一张图");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        type: "moment" as const,
        content: content.trim(),
        images: video ? [] : images,
        video,
      };
      if (post) {
        await api(`/posts/${post.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/posts", { method: "POST", body: JSON.stringify(body) });
      }
      window.dispatchEvent(new Event("post-published"));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="这一刻的想法..."
        rows={5}
        className="w-full resize-none rounded-xl border border-adm-border bg-adm-input px-3 py-2 text-[15px] text-adm-text outline-none"
      />
      {!video && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg bg-wechat-bubble">
              <img src={getImageSrc(img)} alt="" className="h-full w-full object-cover" />
              {isLivePhoto(img) && (
                <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] text-white">实况</span>
              )}
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {images.length < 9 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-adm-border text-wechat-time">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
            </label>
          )}
        </div>
      )}
      {video ? (
        <div className="relative max-w-xs overflow-hidden rounded-lg bg-black">
          <video src={video.url} controls className="w-full" />
          <button type="button" className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white" onClick={() => setVideo(null)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        images.length === 0 && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-adm-border px-3 py-2 text-sm text-adm-text-secondary">
            <Video className="h-4 w-4" />
            上传视频
            <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => addVideo(e.target.files?.[0])} />
          </label>
        )
      )}
      {error && <p className="text-sm text-adm-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-adm-text-secondary">
            取消
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-adm-primary px-4 py-2 text-sm text-adm-primary-text disabled:opacity-50"
        >
          {saving ? "发布中..." : post ? "保存" : "发布"}
        </button>
      </div>
      {images.some((img) => getVideoSrc(img)) && (
        <p className="text-xs text-wechat-time">JPEG 实况图会自动拆成静图 + 视频；iPhone 可先上传静图再在同一格配视频（后台暂用自动拆分）。</p>
      )}
    </div>
  );
}
