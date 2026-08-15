import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Share2, MessageCircle } from "lucide-react";
import DesktopDecorations from "@/components/DesktopDecorations";
import ArticleListSidebar from "@/components/ArticleListSidebar";
import FloatingActions from "@/components/FloatingActions";
import ArticleTopBar from "@/components/ArticleTopBar";
import ArticleContent from "@/components/ArticleContent";
import ArticleCommentSection from "@/components/ArticleCommentSection";
import { api } from "@/lib/api";
import { startGithubLogin, useGithubUser } from "@/lib/github-session";
import { formatArticleTime } from "@/lib/time";
import { readBootstrapProfile } from "@/lib/bootstrap";
import { setDocumentTitle, siteTitleOf } from "@/lib/title";
import { resolveAvatar } from "@/lib/avatar";
import NotFoundPage from "@/pages/NotFoundPage";
import type { Comment, Post, User } from "@/lib/types";

export default function ArticlePage() {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [likes, setLikes] = useState<Array<{ name: string }>>([]);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [focusSignal, setFocusSignal] = useState(0);
  const [siteTitle, setSiteTitle] = useState(siteTitleOf(readBootstrapProfile()));
  const { signedIn } = useGithubUser();

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
    if (post) setDocumentTitle(`${post.title || "文章"} - ${siteTitle}`);
    else setDocumentTitle(siteTitle);
  }, [post, siteTitle]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollRoot = document.getElementById("scroll-root");
    if (scrollRoot) scrollRoot.scrollTop = 0;
  }, [id]);

  const handleLike = async () => {
    if (!signedIn) {
      startGithubLogin();
      return;
    }
    if (liking || !post) return;
    setLiking(true);
    try {
      const data = await api<{ liked: boolean; likes: Array<{ name: string }> }>(`/posts/${post.id}/likes`, {
        method: "POST",
      });
      setLiked(data.liked);
      setLikes(data.likes);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title || "文章", url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("链接已复制到剪贴板");
      } catch {}
    }
  };

  if (error) {
    if (error === "未找到") {
      return <NotFoundPage description="这篇文章不存在或已删除" />;
    }
    return <div className="p-10 text-center text-wechat-time">{error}</div>;
  }
  if (!post) {
    return <div className="p-10 text-center text-wechat-time">加载中...</div>;
  }

  const authorName = post.author.nickname || "博主";
  const authorAvatar = resolveAvatar(post.author.avatar, post.author.email || "", 80);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-wechat-white md:bg-wechat-bg">
      <DesktopDecorations />
      <div className="md:pt-6">
        <div
          id="scroll-root"
          className="md:fixed md:top-6 md:left-[calc(50%-300px)] md:z-10 md:h-[calc(100vh-24px)] md:w-[600px] md:overflow-y-auto md:overflow-x-hidden md:rounded-2xl md:bg-wechat-white md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] dark:md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ArticleTopBar />
          <main className="relative flex min-h-[calc(100vh-3rem)] w-full flex-col bg-wechat-white pb-8 pt-12 md:min-h-[calc(100vh-4rem)] md:pb-12">
            <article className="px-4 pb-28 pt-4 md:px-6 md:pb-20">
              {post.category && (
                <div className="mb-3">
                  <span className="inline-block rounded bg-wechat-bubble px-2 py-0.5 text-xs text-wechat-nickname">
                    {post.category}
                  </span>
                </div>
              )}
              <h1 className="text-[24px] font-medium leading-tight text-wechat-text dark:text-white md:text-[28px]">
                {post.title || "无标题"}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-wechat-time md:text-[13px]">
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                  原创
                </span>
                <span>
                  {authorName}{" "}
                  <Link to="/" className="text-wechat-link hover:underline">
                    {siteTitle}
                  </Link>{" "}
                  {formatArticleTime(post.createdAt)}
                </span>
              </div>
              <ArticleContent
                content={post.content}
                className="article-content rich-content mt-5 text-[16px] leading-[1.8] text-wechat-text dark:text-gray-200 md:text-[18px] md:leading-[1.9]"
              />
              <div className="mt-4 flex items-center justify-end text-[12px] text-wechat-time md:text-[13px]">
                <span>点赞 {likes.length}</span>
              </div>
              <ArticleCommentSection
                postId={post.id}
                authorNickname={authorName}
                comments={comments}
                onCommentsChange={setComments}
                focusSignal={focusSignal}
              />
            </article>
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-wechat-white pb-[env(safe-area-inset-bottom)] md:left-[calc(50%-300px)] md:right-auto md:w-[600px] md:rounded-b-2xl md:pb-0">
              <div className="flex items-center justify-between px-4 py-2 md:py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <img src={authorAvatar} alt={authorName} className="h-8 w-8 shrink-0 rounded-full object-cover md:h-9 md:w-9" />
                  <span className="truncate text-[14px] text-wechat-text md:text-[15px]">{authorName}</span>
                </div>
                <div className="flex shrink-0 items-center gap-4 md:gap-2.5">
                  <button
                    type="button"
                    onClick={handleLike}
                    disabled={liking}
                    className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-wechat-text active:opacity-60 md:flex-row md:gap-1.5 dark:text-gray-400"
                  >
                    <Heart className={`h-[20px] w-[20px] md:h-[17px] md:w-[17px] ${liked ? "fill-current text-red-500" : ""}`} />
                    <span className="text-[10px] md:text-[13px]">赞</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-wechat-text active:opacity-60 md:flex-row md:gap-1.5 dark:text-gray-400"
                  >
                    <Share2 className="h-[20px] w-[20px] md:h-[17px] md:w-[17px]" />
                    <span className="text-[10px] md:text-[13px]">分享</span>
                  </button>
                  <button
                    type="button"
                    data-no-collapse
                    onClick={() => {
                      if (!signedIn) {
                        startGithubLogin();
                        return;
                      }
                      setFocusSignal((n) => n + 1);
                    }}
                    className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-wechat-text active:opacity-60 md:flex-row md:gap-1.5 dark:text-gray-400"
                  >
                    <MessageCircle className="h-[20px] w-[20px] md:h-[17px] md:w-[17px]" />
                    <span className="text-[10px] md:text-[13px]">写留言</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
        <ArticleListSidebar />
      </div>
      <FloatingActions liftAboveBottomBar />
    </div>
  );
}
