import { useEffect, useState } from "react";
import { ImagePlus, Trash2, Video } from "lucide-react";
import type { Post, PostImage, PostVideo } from "@/lib/types";
import { api, uploadFile } from "@/lib/api";
import { isHeicFile, isImageFile, isJpegName, isVideoFile } from "@/lib/heic";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/time";
import LiveBadge from "./LiveBadge";
import PublishTimeField from "./PublishTimeField";
import { getImageSrc, isLivePhoto } from "@/lib/post-image";

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
  const [createdAt, setCreatedAt] = useState(() => toDatetimeLocalValue(post?.createdAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(post?.content || "");
    setImages(post?.images || []);
    setVideo(post?.video || null);
    setCreatedAt(toDatetimeLocalValue(post?.createdAt));
  }, [post]);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const fileArr = Array.from(files);
    if (fileArr.some(isHeicFile)) {
      setError("浏览器不支持 HEIC，请先在本地转成 JPG，再和同名 MOV 一起上传");
      return;
    }

    const groups = new Map<string, { image?: File; video?: File }>();
    for (const file of fileArr) {
      const base = file.name.replace(/\.[^.]+$/, "").toLowerCase();
      if (!groups.has(base)) groups.set(base, {});
      const g = groups.get(base)!;
      if (isImageFile(file)) g.image = file;
      else if (isVideoFile(file)) g.video = file;
    }

    let pairs = Array.from(groups.values()).filter((g): g is { image: File; video: File } => !!(g.image && g.video));
    let unpairedImages = Array.from(groups.values()).flatMap((g) => (g.image && !g.video ? [g.image] : []));
    const unpairedVideos = Array.from(groups.values()).flatMap((g) => (!g.image && g.video ? [g.video] : []));
    if (pairs.length === 0 && unpairedImages.length === 1 && unpairedVideos.length === 1) {
      pairs = [{ image: unpairedImages[0], video: unpairedVideos[0] }];
      unpairedImages = [];
    }

    let added = 0;
    const room = () => 9 - images.length - added;

    for (const pair of pairs) {
      if (room() <= 0) break;
      try {
        const [imgRes, vidRes] = await Promise.all([uploadFile("/upload", pair.image), uploadFile("/upload/video", pair.video)]);
        if (imgRes.url && vidRes.url) {
          const src = imgRes.url;
          const videoUrl = vidRes.url;
          setImages((prev) => [...prev, { src, video: videoUrl }]);
          added += 1;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败");
      }
    }

    for (const file of unpairedImages.slice(0, Math.max(0, room()))) {
      try {
        if (isJpegName(file.name) || file.type === "image/jpeg") {
          const res = await uploadFile("/upload/motion-photo", file);
          if (res.src) {
            setImages((prev) => [...prev, res.video ? { src: res.src, video: res.video } : res.src]);
            added += 1;
            continue;
          }
        }
        const res = await uploadFile("/upload", file);
        if (res.url) {
          const url = res.url;
          setImages((prev) => [...prev, url]);
          added += 1;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败");
      }
    }

    if (unpairedVideos.length > 0 && pairs.length === 0) {
      setError("苹果实况请同时选中同名的 JPG 和 MOV（例如 IMG_1234.JPG 与 IMG_1234.MOV）");
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
    const publishedAt = fromDatetimeLocalValue(createdAt);
    if (createdAt && !publishedAt) {
      setError("发布时间格式不正确");
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
        createdAt: publishedAt || undefined,
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
              {isLivePhoto(img) && <LiveBadge />}
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
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp,.mov,.mp4,video/quicktime,video/mp4" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
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
      <p className="text-xs text-wechat-time">安卓 JPEG 实况会自动拆分；苹果请先把 HEIC 转成 JPG，再同时选中同名的 JPG 和 MOV。</p>
      <PublishTimeField value={createdAt} onChange={setCreatedAt} />
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
    </div>
  );
}
