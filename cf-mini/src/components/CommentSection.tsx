import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";
import { api } from "@/lib/api";
import { getAdmin } from "@/lib/auth";

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  initialReplyTo?: string;
  onReplyCleared?: () => void;
  onCommentAdded?: (comment: Comment) => void;
  connected?: boolean;
}

export default function CommentSection({
  postId,
  initialComments,
  initialReplyTo,
  onReplyCleared,
  onCommentAdded,
  connected = false,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [replyToId, setReplyToId] = useState<string | undefined>(initialReplyTo);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setReplyToId(initialReplyTo), [initialReplyTo]);

  useEffect(() => {
    const admin = getAdmin();
    if (admin) {
      setNickname(admin.nickname);
      setEmail(admin.email);
    } else {
      setNickname(localStorage.getItem("visitor_name") || "");
      setEmail(localStorage.getItem("visitor_email") || "");
    }
  }, []);

  const replyToName = replyToId
    ? initialComments.find((c) => c.id === replyToId)?.author
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    const name = nickname.trim();
    if (!text || !name || submitting) return;
    localStorage.setItem("visitor_name", name);
    localStorage.setItem("visitor_email", email.trim());
    setSubmitting(true);
    setError("");
    try {
      const comment = await api<Comment>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          authorName: name,
          email: email.trim(),
          content: text,
          replyTo: replyToName,
          replyToId,
        }),
      });
      onCommentAdded?.(comment);
      setContent("");
      setReplyToId(undefined);
      onReplyCleared?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-wechat-bubble px-3 py-2 ${connected ? "rounded-b-[4px] -mt-1 pt-3" : "mt-[6px] rounded-[4px]"}`}
    >
      {replyToName && (
        <div className="mb-2 flex items-center justify-between text-[13px] text-wechat-nickname">
          <span>回复 {replyToName}</span>
          <button type="button" className="text-wechat-time" onClick={() => { setReplyToId(undefined); onReplyCleared?.(); }}>
            取消
          </button>
        </div>
      )}
      {!getAdmin() && (
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="昵称"
            className="rounded bg-wechat-white px-2 py-1.5 text-[13px] outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱（选填）"
            className="rounded bg-wechat-white px-2 py-1.5 text-[13px] outline-none"
          />
        </div>
      )}
      <textarea
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="评论"
        rows={2}
        className="w-full resize-none rounded bg-wechat-white px-2 py-1.5 text-[14px] outline-none"
      />
      {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-wechat-nickname px-3 py-1 text-[13px] text-white disabled:opacity-50"
        >
          {submitting ? "发送中" : "发送"}
        </button>
      </div>
    </form>
  );
}
