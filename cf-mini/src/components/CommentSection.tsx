import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";
import { api } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import { logoutGithub, useGithubUser } from "@/lib/github-session";
import GithubLoginButton from "./GithubLoginButton";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const admin = getAdmin();
  const { user, ready, signedIn, configured } = useGithubUser();
  const displayName = admin?.nickname || user?.nickname || "";

  useEffect(() => setReplyToId(initialReplyTo), [initialReplyTo]);

  const replyToName = replyToId
    ? initialComments.find((c) => c.id === replyToId)?.author
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !signedIn || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await api<Comment>(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({
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
      {ready && !signedIn ? (
        <div className="flex flex-col items-start gap-2 py-1">
          <p className="text-[13px] text-wechat-time">评论需要先登录</p>
          {configured ? (
            <GithubLoginButton label="使用 GitHub 登录后评论" />
          ) : (
            <p className="text-[12px] text-wechat-time">站长尚未配置 GitHub 登录</p>
          )}
        </div>
      ) : (
        <>
          {signedIn && (
            <div className="mb-2 flex items-center justify-between text-[12px] text-wechat-time">
              <span>以 {displayName} 评论</span>
              {!admin && user && (
                <button
                  type="button"
                  className="hover:text-wechat-nickname"
                  onClick={() => logoutGithub().catch(() => {})}
                >
                  退出
                </button>
              )}
            </div>
          )}
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={signedIn ? "评论" : "登录后评论"}
            rows={2}
            disabled={!signedIn}
            className="w-full resize-none rounded bg-wechat-white px-2 py-1.5 text-[14px] outline-none disabled:opacity-60"
          />
          {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !signedIn}
              className="rounded bg-wechat-nickname px-3 py-1 text-[13px] text-white disabled:opacity-50"
            >
              {submitting ? "发送中" : "发送"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
