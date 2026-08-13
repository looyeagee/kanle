export type PostImage = string | { src: string; video?: string };

export type PostVideo = {
  url: string;
  cover?: string;
  source: "upload" | "url";
};

export type User = {
  id: string;
  nickname: string;
  avatar: string;
  cover: string;
  bio: string;
  email?: string;
  siteTitle?: string;
};

export type Comment = {
  id: string;
  author: string;
  email?: string;
  replyTo?: string;
  replyToId?: string;
  content: string;
  createdAt: string;
};

export type Post = {
  id: string;
  type: "moment" | "article";
  title?: string;
  excerpt?: string;
  cover?: string;
  category?: string;
  content: string;
  images: PostImage[];
  video?: PostVideo | null;
  pinned?: boolean;
  createdAt: string;
  author: User;
  likes: Array<{ name: string; email?: string }>;
  comments: Comment[];
  meLiked?: boolean;
};
