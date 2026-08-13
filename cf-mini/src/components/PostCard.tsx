import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Pin } from "lucide-react";
import type { Comment, Post } from "@/lib/types";
import { api } from "@/lib/api";
import { getAdmin, getVisitorName } from "@/lib/auth";
import { renderPlain } from "@/lib/markdown";
import { resolveAvatar } from "@/lib/avatar";
import { formatRelativeTime } from "@/lib/time";
import ImageGrid from "./ImageGrid";
import VideoPlayer from "./VideoPlayer";
import InteractionBubble from "./InteractionBubble";
import ActionMenu from "./ActionMenu";
import CommentSection from "./CommentSection";

export default function PostCard({
  post,
  index,
  onDelete,
  onEdit,
}: {
  post: Post;
  index: number;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const navigate = useNavigate();
  const isArticle = post.type === "article";
  const articleUrl = `/articles/${post.id}`;
  const [likes, setLikes] = useState(post.likes || []);
  const [liked, setLiked] = useState(!!post.meLiked);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [pinned, setPinned] = useState(!!post.pinned);
  const [expanded, setExpanded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const isAdmin = !!getAdmin();

  useEffect(() => {
    setLiked(!!post.meLiked);
    setLikes(post.likes || []);
    setComments(post.comments || []);
  }, [post.id, post.meLiked, post.likes, post.comments]);

  useEffect(() => {
    if (!showComments) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!articleRef.current?.contains(e.target as Node)) {
        setShowComments(false);
        setReplyTo(undefined);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown, { passive: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [showComments]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prev = liked;
    setLiked(!prev);
    try {
      const data = await api<{ liked: boolean; likes: Array<{ name: string }> }>(`/posts/${post.id}/likes`, {
        method: "POST",
        body: JSON.stringify({ name: getVisitorName() }),
      });
      setLiked(data.liked);
      setLikes(data.likes);
    } catch {
      setLiked(prev);
    } finally {
      setLiking(false);
    }
  };

  const handlePin = async () => {
    if (!isAdmin) return;
    const next = !pinned;
    await api(`/posts/${post.id}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned: next }),
    });
    setPinned(next);
  };

  const excerpt = post.excerpt || (post.content || "").replace(/[#>*_`\-\[\]]/g, "").slice(0, 80);
  const clippable = !isArticle && (post.content || "").length > 90;
  const avatar = resolveAvatar(post.author.avatar, post.author.email || "", 96);

  return (
    <article
      ref={articleRef}
      id={`post-${post.id}`}
      className="flex gap-3 px-4 py-4 sm:px-5 md:px-6 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[5px] bg-wechat-bubble md:h-11 md:w-11">
        <img src={avatar} alt={post.author.nickname} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center justify-between gap-2 text-[15px] font-medium leading-5 text-wechat-nickname md:text-[16px]">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{post.author.nickname}</span>
            {pinned && <Pin className="h-[15px] w-[15px] shrink-0 rotate-45 text-[#9a9a9a]" fill="currentColor" />}
          </span>
          {pinned && (
            <span className="shrink-0 rounded-[4px] bg-[#ececec] px-2 py-0.5 text-[11px] font-medium text-[#9a9a9a] dark:bg-white/[0.1]">
              置顶
            </span>
          )}
        </h3>

        {!isArticle && post.content && (
          <div className="mt-1">
            <div
              className={`rich-content relative text-[15px] leading-[23px] text-wechat-text md:text-[16px] md:leading-[24px] ${clippable && !expanded ? "collapsed" : ""}`}
              style={clippable && !expanded ? { WebkitLineClamp: 4 } : undefined}
              dangerouslySetInnerHTML={{ __html: renderPlain(post.content) }}
            />
            {clippable && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 text-[14px] text-[#576b95] dark:text-[#7d94c4]"
              >
                {expanded ? "收起" : "全文"}
              </button>
            )}
          </div>
        )}

        {!isArticle && (post.video ? <VideoPlayer video={post.video} /> : <ImageGrid images={post.images || []} />)}

        {isArticle && (
          <Link
            to={articleUrl}
            className="mt-2 flex w-full max-w-[240px] items-stretch overflow-hidden rounded-[8px] bg-[#f2f2f2] transition-colors hover:bg-[#eaeaea] dark:bg-[#2a2a30] md:max-w-[280px]"
          >
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-black/5 md:h-[80px] md:w-[80px] dark:bg-white/5">
              {post.cover ? (
                <img src={post.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FileText className="h-6 w-6 text-black/30 dark:text-white/30" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center bg-white/35 px-3 dark:bg-white/[0.04]">
              <p className="line-clamp-1 text-[14px] font-medium text-black/[0.87] dark:text-white/90">{post.title || "无标题文章"}</p>
              {excerpt && <p className="line-clamp-2 mt-0.5 text-[12px] text-black/50 dark:text-white/50">{excerpt}</p>}
            </div>
          </Link>
        )}

        <div className="mt-2 flex items-center justify-between">
          <time className="text-[13px] text-wechat-time md:text-[14px]">{formatRelativeTime(post.createdAt)}</time>
          <ActionMenu
            onLike={handleLike}
            onComment={() => setShowComments((v) => !v)}
            onEdit={isAdmin && !isArticle ? onEdit : isAdmin && isArticle ? () => navigate(`/admin/articles/${post.id}`) : undefined}
            onDelete={onDelete}
            onPin={isAdmin ? handlePin : undefined}
            liked={liked}
            pinned={pinned}
          />
        </div>

        <InteractionBubble
          likes={likes}
          comments={comments}
          onReply={(commentId) => {
            setReplyTo(commentId);
            setShowComments(true);
          }}
        />
        {showComments && (
          <CommentSection
            postId={post.id}
            initialComments={comments}
            initialReplyTo={replyTo}
            onReplyCleared={() => setReplyTo(undefined)}
            onCommentAdded={(c: Comment) => setComments((prev) => [...prev, c])}
            connected={likes.length > 0 || comments.length > 0}
          />
        )}
      </div>
    </article>
  );
}
