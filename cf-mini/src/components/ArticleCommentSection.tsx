import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Smile, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Comment } from "@/lib/types";
import { api } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import { resolveAvatar } from "@/lib/avatar";
import { formatRelativeTime } from "@/lib/time";
import { logoutGithub, startGithubLogin, useGithubUser } from "@/lib/github-session";
import GithubLoginButton from "./GithubLoginButton";

function findRootId(comment: Comment, comments: Comment[]): string | null {
  let cur: Comment | undefined = comment;
  const seen = new Set<string>();
  while (cur?.replyToId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = comments.find((c) => c.id === cur!.replyToId);
    if (!parent) return cur.replyToId;
    if (!parent.replyTo && !parent.replyToId) return parent.id;
    cur = parent;
  }
  return null;
}

export default function ArticleCommentSection({
  postId,
  authorNickname,
  comments,
  onCommentsChange,
  focusSignal,
}: {
  postId: string;
  authorNickname: string;
  comments: Comment[];
  onCommentsChange: (comments: Comment[]) => void;
  focusSignal?: number;
}) {
  const admin = getAdmin();
  const { user, signedIn, configured, ready } = useGithubUser();
  const displayName = admin?.nickname || user?.nickname || "";
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [replyToId, setReplyToId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inlineReplyId, setInlineReplyId] = useState<string | null>(null);
  const [inlineContent, setInlineContent] = useState("");
  const [inlineSubmitting, setInlineSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inlineRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef(false);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!focusSignal) return;
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [focusSignal]);

  const replyToName = replyToId ? comments.find((c) => c.id === replyToId)?.author : undefined;

  const threads = useMemo(() => {
    const topLevel = comments.filter((c) => !c.replyTo && !c.replyToId);
    const replies = comments.filter((c) => c.replyTo || c.replyToId);
    const byRoot = new Map<string, Comment[]>();
    const orphans: Comment[] = [];
    for (const reply of replies) {
      const rootId = findRootId(reply, comments);
      if (rootId) {
        const list = byRoot.get(rootId) || [];
        list.push(reply);
        byRoot.set(rootId, list);
      } else {
        orphans.push(reply);
      }
    }
    for (const group of byRoot.values()) {
      group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    const result = topLevel.map((parent) => ({ parent, replies: byRoot.get(parent.id) || [] }));
    for (const orphan of orphans) result.push({ parent: orphan, replies: [] });
    return result;
  }, [comments]);

  const submit = async (text: string, replyTo?: string, replyToCommentId?: string) => {
    return api<Comment>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({
        content: text,
        replyTo,
        replyToId: replyToCommentId,
      }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !signedIn || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const comment = await submit(text, replyToName, replyToId);
      onCommentsChange([...comments, comment]);
      setContent("");
      setReplyToId(undefined);
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineSubmit = async (target: Comment) => {
    const text = inlineContent.trim();
    if (!text || !signedIn || inlineSubmitting) return;
    setInlineSubmitting(true);
    setInlineError("");
    try {
      const comment = await submit(text, target.author, target.id);
      onCommentsChange([...comments, comment]);
      const rootId = target.replyTo || target.replyToId ? findRootId(target, comments) : target.id;
      if (rootId) setExpandedThreads((prev) => new Set(prev).add(rootId));
      setInlineContent("");
      setInlineReplyId(null);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setInlineSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("删除这条评论？")) return;
    await api(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
    onCommentsChange(comments.filter((c) => c.id !== commentId));
  };

  const toggleThread = useCallback((id: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const loginHint = !ready ? null : !signedIn ? (
    <div className="flex flex-col items-start gap-2 py-1">
      <p className="text-[13px] text-wechat-time">留言需要先登录</p>
      {configured ? <GithubLoginButton label="使用 GitHub 登录后留言" /> : <p className="text-[12px] text-wechat-time">站长尚未配置 GitHub 登录</p>}
    </div>
  ) : null;

  const renderInline = (comment: Comment) => {
    if (inlineReplyId !== comment.id) return null;
    return (
      <div className="mt-2">
        {!signedIn ? (
          loginHint
        ) : (
          <>
            <div className="rounded-md bg-gray-100 dark:bg-[#232328]">
              <textarea
                ref={inlineRef}
                value={inlineContent}
                onChange={(e) => setInlineContent(e.target.value)}
                placeholder={`回复 ${comment.author}...`}
                rows={2}
                className="inline-comment-editor w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-[15px] leading-[23px] text-wechat-text outline-none md:text-[16px]"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1">
              <span className="text-[13px] text-wechat-time">
                {inlineError ? <span className="text-red-500">{inlineError}</span> : inlineContent.length > 0 ? `${inlineContent.length} 字` : null}
              </span>
              {inlineContent.trim() && (
                <button
                  type="button"
                  onClick={() => handleInlineSubmit(comment)}
                  disabled={inlineSubmitting}
                  className="rounded-[4px] bg-[#07c160] px-4 py-1.5 text-[14px] font-medium text-white hover:bg-[#06ad56] disabled:bg-gray-300"
                >
                  {inlineSubmitting ? "发送中" : "发送"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMeta = (comment: Comment, compact?: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`font-medium text-wechat-nickname ${compact ? "text-[13px]" : "text-[14px] md:text-[15px]"}`}>
        {comment.author}
      </span>
      {comment.author === authorNickname && (
        <span className={`font-medium text-[#07c160] ${compact ? "text-[11px]" : "text-[12px]"}`}>作者</span>
      )}
      <span className={`text-wechat-time ${compact ? "text-[11px]" : "text-[12px] md:text-[13px]"}`}>
        {formatRelativeTime(comment.createdAt)}
      </span>
    </div>
  );

  const renderActions = (comment: Comment, compact?: boolean) => (
    <div className={`flex shrink-0 items-center gap-4 pb-0.5 ${compact ? "gap-3" : ""}`}>
      <button
        type="button"
        data-no-collapse
        onClick={() => {
          if (!signedIn) {
            startGithubLogin();
            return;
          }
          setInlineReplyId((id) => (id === comment.id ? null : comment.id));
          setInlineContent("");
          setInlineError("");
        }}
        className={`text-wechat-time transition-colors hover:text-wechat-nickname ${compact ? "text-[11px]" : "text-[12px] md:text-[13px]"}`}
      >
        回复
      </button>
      {(comment.mine || admin) && (
        <button
          type="button"
          onClick={() => handleDelete(comment.id)}
          className={`text-wechat-time transition-colors hover:text-red-500 ${compact ? "text-[11px]" : "text-[12px] md:text-[13px]"}`}
        >
          删除
        </button>
      )}
    </div>
  );

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-1 text-[16px] font-bold text-wechat-text dark:text-white md:text-[17px]">
        <span>留言</span>
        {comments.length > 0 && <span className="text-[14px] font-bold md:text-[15px]">{comments.length}</span>}
      </h3>

      <form onSubmit={handleSubmit}>
        {!expanded ? (
          <div
            onClick={() => {
              if (!signedIn) {
                startGithubLogin();
                return;
              }
              setExpanded(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="flex cursor-text items-center justify-between rounded-md bg-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-200/60 dark:bg-[#232328] dark:hover:bg-[#2a2a30]"
          >
            <span className="text-[15px] text-wechat-time md:text-[16px]">写留言</span>
            <Smile className="h-5 w-5 text-wechat-time md:h-[18px] md:w-[18px]" />
          </div>
        ) : (
          <>
            {!signedIn ? (
              <div className="mb-2">{loginHint}</div>
            ) : (
              <>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-wechat-nickname md:text-[14px]">{displayName}</span>
                    {replyToName && (
                      <span className="ml-1 flex items-center gap-1 text-[13px] text-wechat-time">
                        <span>回复</span>
                        <span className="text-wechat-nickname">{replyToName}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!admin && user && (
                      <button type="button" onClick={() => logoutGithub().catch(() => {})} className="text-[13px] text-wechat-time hover:text-wechat-nickname">
                        退出
                      </button>
                    )}
                    {replyToId && (
                      <button type="button" onClick={() => setReplyToId(undefined)} className="text-wechat-time hover:text-wechat-text" aria-label="取消回复">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-md bg-gray-100 dark:bg-[#232328]">
                  <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={replyToName ? `回复 ${replyToName}...` : "写留言"}
                    rows={3}
                    className="comment-editor w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-[15px] leading-[23px] text-wechat-text outline-none md:text-[16px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                      }
                      if (e.key === "Escape") setExpanded(false);
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[13px] text-wechat-time">
                    {error ? <span className="text-red-500">{error}</span> : content.length > 0 ? `${content.length} 字` : <span className="hidden sm:inline">Ctrl + Enter 发送</span>}
                  </span>
                  {content.trim() && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-[4px] bg-[#07c160] px-4 py-1.5 text-[14px] font-medium text-white hover:bg-[#06ad56] disabled:bg-gray-300"
                    >
                      {submitting ? "发送中" : "发送"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </form>

      {comments.length > 0 ? (
        <div className="mt-4 space-y-4">
          {threads.map((thread, threadIndex) => {
            const { parent, replies } = thread;
            const isExpanded = expandedThreads.has(parent.id);
            const isOrphan = !!parent.replyTo;
            return (
              <div key={parent.id} id={`comment-${parent.id}`} className="flex gap-3 scroll-mt-20">
                <img src={resolveAvatar(parent.avatar || "", parent.email || parent.author, 80)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  {renderMeta(parent)}
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[14px] leading-[1.6] text-wechat-text dark:text-gray-200 md:text-[15px]">{parent.content}</p>
                    {renderActions(parent)}
                  </div>
                  {threadIndex === 0 && !isOrphan && <div className="mt-1 text-[12px] text-[#07c160]">首评</div>}
                  {renderInline(parent)}
                  {replies.length > 0 && !isExpanded && (
                    <button type="button" onClick={() => toggleThread(parent.id)} className="mt-2 flex items-center gap-1 text-[12px] text-[#576b95] hover:text-[#07c160] dark:text-[#7d8db5]">
                      {replies.length}条回复
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  )}
                  {isExpanded && replies.length > 0 && (
                    <>
                      <div className="mt-2 space-y-3">
                        {replies.map((reply) => {
                          const showReplyTo = reply.replyToId ? reply.replyToId !== parent.id : reply.replyTo !== parent.author;
                          return (
                            <div key={reply.id} id={`comment-${reply.id}`} className="flex gap-2 scroll-mt-20">
                              <img src={resolveAvatar(reply.avatar || "", reply.email || reply.author, 80)} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[13px] font-medium text-wechat-nickname">{reply.author}</span>
                                  {reply.author === authorNickname && <span className="text-[11px] font-medium text-[#07c160]">作者</span>}
                                  {showReplyTo && reply.replyTo && (
                                    <span className="text-[12px] text-wechat-time">
                                      回复 <span className="text-wechat-nickname">@{reply.replyTo}</span>
                                    </span>
                                  )}
                                  <span className="text-[11px] text-wechat-time">{formatRelativeTime(reply.createdAt)}</span>
                                </div>
                                <div className="mt-0.5 flex items-end justify-between gap-2">
                                  <p className="min-w-0 flex-1 text-[13px] leading-[1.5] text-wechat-text dark:text-gray-200">{reply.content}</p>
                                  {renderActions(reply, true)}
                                </div>
                                {renderInline(reply)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button type="button" onClick={() => toggleThread(parent.id)} className="mt-2 flex items-center gap-1 text-[12px] text-[#576b95] hover:text-[#07c160] dark:text-[#7d8db5]">
                        <ChevronUp className="h-3 w-3" />
                        收起
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-center text-[13px] text-wechat-time">还没有留言，快来抢沙发~</p>
      )}
    </div>
  );
}
