export type PostImage = string | { src: string; video?: string };

export type PostVideo = {
  url: string;
  cover?: string;
  source: "upload" | "url";
};

export type Profile = {
  nickname: string;
  avatar: string;
  cover: string;
  bio: string;
  email: string;
  siteTitle: string;
};

export type PostRow = {
  id: string;
  type: "moment" | "article";
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  content: string;
  images_json: string;
  video_json: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_name: string;
  email: string;
  reply_to: string | null;
  reply_to_id: string | null;
  content: string;
  created_at: string;
};

export type LikeRow = {
  id: string;
  post_id: string;
  name: string;
  visitor_id: string;
  created_at: string;
};

export function parseImages(raw: string): PostImage[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function parseVideo(raw: string | null): PostVideo | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v.url === "string") return v as PostVideo;
    return null;
  } catch {
    return null;
  }
}

export function mapComment(row: CommentRow) {
  return {
    id: row.id,
    author: row.author_name,
    email: row.email || undefined,
    replyTo: row.reply_to || undefined,
    replyToId: row.reply_to_id || undefined,
    content: row.content,
    createdAt: toIso(row.created_at),
  };
}

export function mapPost(
  row: PostRow,
  profile: Profile,
  likes: LikeRow[],
  comments: CommentRow[],
  visitorId: string
) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    excerpt: row.excerpt,
    cover: row.cover,
    category: row.category,
    content: row.content,
    images: parseImages(row.images_json),
    video: parseVideo(row.video_json),
    pinned: row.pinned === 1,
    createdAt: toIso(row.created_at),
    author: {
      id: "owner",
      nickname: profile.nickname,
      avatar: profile.avatar,
      cover: profile.cover,
      bio: profile.bio,
      email: profile.email,
    },
    likes: likes.map((l) => ({ name: l.name })),
    comments: comments.map(mapComment),
    meLiked: likes.some((l) => l.visitor_id === visitorId),
  };
}

export async function getProfile(db: D1Database): Promise<Profile> {
  const row = await db
    .prepare("SELECT nickname, avatar, cover, bio, email, site_title FROM site_profile LIMIT 1")
    .first<{
      nickname: string;
      avatar: string;
      cover: string;
      bio: string;
      email: string;
      site_title: string;
    }>();
  const nickname = row?.nickname || "看了";
  return {
    nickname,
    avatar: row?.avatar || "",
    cover: row?.cover || "",
    bio: row?.bio || "",
    email: row?.email || "",
    siteTitle: (row?.site_title || "").trim() || nickname,
  };
}

function toIso(value: string): string {
  if (!value) return new Date().toISOString();
  if (value.includes("T")) return new Date(value).toISOString();
  return new Date(value.replace(" ", "T") + "Z").toISOString();
}

export async function loadPostBundle(
  db: D1Database,
  posts: PostRow[],
  visitorId: string
) {
  const profile = await getProfile(db);
  if (posts.length === 0) {
    return { profile, items: [] as ReturnType<typeof mapPost>[] };
  }
  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");
  const [likesRes, commentsRes] = await db.batch([
    db.prepare(`SELECT * FROM likes WHERE post_id IN (${placeholders})`).bind(...ids),
    db
      .prepare(
        `SELECT * FROM comments WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`
      )
      .bind(...ids),
  ]);
  const likes = (likesRes.results || []) as LikeRow[];
  const comments = (commentsRes.results || []) as CommentRow[];
  const likesByPost = new Map<string, LikeRow[]>();
  const commentsByPost = new Map<string, CommentRow[]>();
  for (const like of likes) {
    const list = likesByPost.get(like.post_id) || [];
    list.push(like);
    likesByPost.set(like.post_id, list);
  }
  for (const comment of comments) {
    const list = commentsByPost.get(comment.post_id) || [];
    list.push(comment);
    commentsByPost.set(comment.post_id, list);
  }
  return {
    profile,
    items: posts.map((row) =>
      mapPost(row, profile, likesByPost.get(row.id) || [], commentsByPost.get(row.id) || [], visitorId)
    ),
  };
}
