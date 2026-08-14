import type { Post, User } from "./types";

export type BootstrapPayload = {
  nickname?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  email?: string;
  siteTitle?: string;
  posts?: Post[];
  postsHasMore?: boolean;
  articles?: Post[];
  articlesHasMore?: boolean;
};

declare global {
  interface Window {
    __KANLE_BOOTSTRAP__?: BootstrapPayload | null;
  }
}

const emptyOwner: User = {
  id: "owner",
  nickname: "",
  avatar: "",
  cover: "",
  bio: "",
};

export function emptyProfile(): User {
  return { ...emptyOwner };
}

function rawBootstrap(): BootstrapPayload | null {
  const raw = typeof window === "undefined" ? null : window.__KANLE_BOOTSTRAP__;
  if (!raw || typeof raw !== "object") return null;
  return raw;
}

export function readBootstrapProfile(): User | null {
  const raw = rawBootstrap();
  if (!raw) return null;
  if (!raw.nickname && !raw.siteTitle && !raw.avatar && !raw.cover && !raw.bio) {
    return null;
  }
  return {
    id: "owner",
    nickname: raw.nickname || "",
    avatar: raw.avatar || "",
    cover: raw.cover || "",
    bio: raw.bio || "",
    email: raw.email || "",
    siteTitle: raw.siteTitle || "",
  };
}

export function readBootstrapFeed(): { posts: Post[]; hasMore: boolean } | null {
  const raw = rawBootstrap();
  if (!raw || !Array.isArray(raw.posts)) return null;
  return { posts: raw.posts, hasMore: !!raw.postsHasMore };
}

export function readBootstrapArticles(): { articles: Post[]; hasMore: boolean } | null {
  const raw = rawBootstrap();
  if (!raw || !Array.isArray(raw.articles)) return null;
  return { articles: raw.articles, hasMore: !!raw.articlesHasMore };
}
