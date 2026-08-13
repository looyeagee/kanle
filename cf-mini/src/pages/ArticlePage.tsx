import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DesktopDecorations from "@/components/DesktopDecorations";
import ArticleListSidebar from "@/components/ArticleListSidebar";
import FloatingActions from "@/components/FloatingActions";
import InteractionBubble from "@/components/InteractionBubble";
import CommentSection from "@/components/CommentSection";
import ActionMenu from "@/components/ActionMenu";
import { api } from "@/lib/api";
import { getAdmin, getVisitorName } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";
import { formatRelativeTime } from "@/lib/time";
import { readBootstrapProfile } from "@/lib/bootstrap";
import { setDocumentTitle, siteTitleOf } from "@/lib/title";
import type { Comment, Post, User } from "@/lib/types";

export default function ArticlePage() {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [likes, setLikes] = useState<Array<{ name: string }>>([]);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [siteTitle, setSiteTitle] = useState(siteTitleOf(readBootstrapProfile()));

  useEffect(() => {
    api<User>("/profile")
      .then((p) => setSiteTitle(siteTitleOf(p)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api<Post>(`/posts/${id}`)
      .then((p) => {
        setPost(p);
        setLikes(p.likes || []);
        setLiked(!!p.meLiked);
        setComments(p.comments || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, [id]);

  useEffect(() => {
    if (post) {
      setDocumentTitle(`${post.title || "文章"} - ${siteTitle}`);
    } else {
      setDocumentTitle(siteTitle);
    }
  }, [post, siteTitle]);

  if (error) {
    return <div className="p-10 text-center text-wechat-time">{error}</div>;
  }
  if (!post) {
    return <div className="p-10 text-center text-wechat-time">加载中...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="md:pt-6">
        <div
          id="scroll-root"
          className="md:fixed md:top-6 md:left-[calc(50%-300px)] md:z-10 md:h-[calc(100vh-48px)] md:w-[600px] md:overflow-y-auto md:rounded-2xl md:bg-wechat-white md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <main className="relative bg-wechat-white pb-12">
            {post.cover ? (
              <img src={post.cover} alt="" className="h-52 w-full object-cover md:rounded-t-2xl" />
            ) : (
              <div className="cover-fallback h-36 w-full md:rounded-t-2xl" />
            )}
            <div className="px-5 pt-5 md:px-6">
              <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-wechat-nickname">
                <ArrowLeft className="h-4 w-4" />
                返回
              </Link>
              <h1 className="text-2xl font-semibold leading-snug text-wechat-text">{post.title}</h1>
              <div className="mt-2 flex items-center justify-between text-[13px] text-wechat-time">
                <span>
                  {post.author.nickname}
                  {post.category ? ` · ${post.category}` : ""} · {formatRelativeTime(post.createdAt)}
                </span>
                <ActionMenu
                  onLike={async () => {
                    const data = await api<{ liked: boolean; likes: Array<{ name: string }> }>(`/posts/${post.id}/likes`, {
                      method: "POST",
                      body: JSON.stringify({ name: getVisitorName() }),
                    });
                    setLiked(data.liked);
                    setLikes(data.likes);
                  }}
                  onComment={() => setShowComments(true)}
                  liked={liked}
                />
              </div>
              <div
                className="rich-content mt-6 text-[16px] leading-7 text-wechat-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />
              <div className="mt-8">
                <InteractionBubble
                  likes={likes}
                  comments={comments}
                  onReply={(cid) => {
                    setReplyTo(cid);
                    setShowComments(true);
                  }}
                  onDeleteComment={
                    getAdmin()
                      ? async (commentId) => {
                          if (!id || !confirm("删除这条评论？")) return;
                          await api(`/posts/${id}/comments/${commentId}`, { method: "DELETE" });
                          setComments((prev) => prev.filter((c) => c.id !== commentId));
                        }
                      : undefined
                  }
                />
                {showComments && (
                  <CommentSection
                    postId={post.id}
                    initialComments={comments}
                    initialReplyTo={replyTo}
                    onReplyCleared={() => setReplyTo(undefined)}
                    onCommentAdded={(c) => setComments((prev) => [...prev, c])}
                    connected={likes.length > 0 || comments.length > 0}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
        <ArticleListSidebar />
      </div>
      <FloatingActions />
    </div>
  );
}
