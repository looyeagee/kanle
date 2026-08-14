import { Heart } from "lucide-react";
import { useState } from "react";
import type { Comment } from "@/lib/types";

type LikeInfo = { name: string; email?: string };

interface InteractionBubbleProps {
  likes: LikeInfo[];
  comments: Comment[];
  onReply?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  canDeleteAll?: boolean;
}

const MAX_DISPLAY_NAMES = 5;
const COMMENT_COLLAPSE_THRESHOLD = 5;

function formatLikes(likes: LikeInfo[]): string {
  const displayNames = Array.from(new Set(likes.map((l) => l.name).filter(Boolean)));
  if (displayNames.length === 0) return "";
  if (displayNames.length > MAX_DISPLAY_NAMES) {
    return `${displayNames.slice(0, MAX_DISPLAY_NAMES).join("，")}等 ${displayNames.length} 人觉得很赞`;
  }
  return `${displayNames.join("，")}觉得很赞`;
}

export default function InteractionBubble({ likes, comments, onReply, onDeleteComment, canDeleteAll }: InteractionBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  if (likes.length === 0 && comments.length === 0) return null;
  const likesText = formatLikes(likes);
  const shouldCollapse = comments.length >= COMMENT_COLLAPSE_THRESHOLD;
  const displayedComments = shouldCollapse && !expanded
    ? comments.slice(0, COMMENT_COLLAPSE_THRESHOLD - 1)
    : comments;

  return (
    <div className="relative mt-[6px] rounded-[4px] bg-wechat-bubble px-3 py-2">
      {likes.length > 0 && (
        <div className="flex items-start gap-1.5 text-[14px] font-normal leading-[22px] text-wechat-nickname md:text-[15px]">
          <Heart className="mt-[2.5px] h-4 w-4 shrink-0 text-wechat-nickname md:mt-[2px] md:h-[18px] md:w-[18px]" />
          <span className="break-all">{likesText}</span>
        </div>
      )}
      {likes.length > 0 && comments.length > 0 && <div className="my-1.5 h-px bg-wechat-divider" />}
      {comments.length > 0 && (
        <ul className="space-y-[3px] text-[15px] font-normal leading-[24px] md:text-[16px]">
          {displayedComments.map((comment) => (
            <li key={comment.id} id={`comment-${comment.id}`} className="flex items-start gap-2 scroll-mt-20">
              <button
                type="button"
                onClick={() => onReply?.(comment.id)}
                className="min-w-0 flex-1 cursor-pointer break-all text-left transition-colors hover:text-wechat-link"
              >
                <span className="text-wechat-nickname">{comment.author}</span>
                {comment.replyTo && (
                  <>
                    <span className="px-1 text-gray-400">回复</span>
                    <span className="text-wechat-nickname">{comment.replyTo}</span>
                  </>
                )}
                <span className="text-wechat-text">：{comment.content}</span>
              </button>
              {(canDeleteAll || comment.mine) && onDeleteComment && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  className="mt-[1px] shrink-0 text-[13px] leading-[24px] text-wechat-time transition-colors hover:text-red-500"
                >
                  删除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 text-[14px] text-[#b2b2b2] transition-opacity hover:opacity-70 dark:text-[#888] md:text-[15px]"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}
