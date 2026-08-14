import { rewriteMediaText, rewriteMediaUrl } from "./media";

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
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  reply_to: string | null;
  reply_to_id: string | null;
  content: string;
  created_at: string;
};

export type LikeRow = {
  id: string;
  post_id: string;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
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

export function mapComment(row: CommentRow, actorUsername?: string | null) {
  const username = row.username.trim();
  return {
    id: row.id,
    author: row.nickname.trim(),
    email: row.email || undefined,
    replyTo: row.reply_to || undefined,
    replyToId: row.reply_to_id || undefined,
    content: row.content,
    createdAt: toIso(row.created_at),
    mine: !!actorUsername && !!username && username === actorUsername,
  };
}

function rewriteImage(env: Env, image: PostImage): PostImage {
  if (typeof image === "string") return rewriteMediaUrl(env, image);
  return {
    src: rewriteMediaUrl(env, image.src),
    video: image.video ? rewriteMediaUrl(env, image.video) : undefined,
  };
}

function rewriteVideo(env: Env, video: PostVideo | null): PostVideo | null {
  if (!video) return null;
  return {
    ...video,
    url: rewriteMediaUrl(env, video.url),
    cover: video.cover ? rewriteMediaUrl(env, video.cover) : undefined,
  };
}

export function mapPost(
  row: PostRow,
  profile: Profile,
  likes: LikeRow[],
  comments: CommentRow[],
  env: Env,
  actorUsername?: string | null
) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    excerpt: row.excerpt,
    cover: rewriteMediaUrl(env, row.cover),
    category: row.category,
    content: rewriteMediaText(env, row.content),
    images: parseImages(row.images_json).map((image) => rewriteImage(env, image)),
    video: rewriteVideo(env, parseVideo(row.video_json)),
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
    likes: likes.map((l) => ({ name: l.nickname })),
    comments: comments.map((comment) => mapComment(comment, actorUsername)),
    meLiked: !!actorUsername && likes.some((l) => l.username === actorUsername),
  };
}

export async function getProfile(db: D1Database, env: Env): Promise<Profile> {
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
    avatar: rewriteMediaUrl(env, row?.avatar || ""),
    cover: rewriteMediaUrl(env, row?.cover || ""),
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

export async function queryPostRows(
  db: D1Database,
  opts: { page: number; limit: number; type?: string }
) {
  const offset = (opts.page - 1) * opts.limit;
  const stmt =
    opts.type === "moment" || opts.type === "article"
      ? db
          .prepare(
            "SELECT * FROM posts WHERE type = ? ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?"
          )
          .bind(opts.type, opts.limit + 1, offset)
      : db
          .prepare("SELECT * FROM posts ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?")
          .bind(opts.limit + 1, offset);
  const rows = await stmt.all<PostRow>();
  const list = rows.results || [];
  const hasMore = list.length > opts.limit;
  return { rows: hasMore ? list.slice(0, opts.limit) : list, hasMore };
}

export async function listPosts(
  db: D1Database,
  env: Env,
  opts: { page: number; limit: number; type?: string; actorUsername?: string | null; profile?: Profile }
) {
  const { rows, hasMore } = await queryPostRows(db, opts);
  const bundle = await loadPostBundle(db, rows, env, opts.actorUsername, opts.profile);
  return { items: bundle.items, profile: bundle.profile, hasMore };
}

export async function loadHomeBootstrap(db: D1Database, env: Env, actorUsername?: string | null) {
  const profile = await getProfile(db, env);
  const [feed, articles] = await Promise.all([
    listPosts(db, env, { page: 1, limit: 10, actorUsername, profile }),
    listPosts(db, env, { page: 1, limit: 5, type: "article", actorUsername, profile }),
  ]);
  return {
    profile,
    posts: feed.items,
    postsHasMore: feed.hasMore,
    articles: articles.items,
    articlesHasMore: articles.hasMore,
  };
}

export async function loadPostBundle(
  db: D1Database,
  posts: PostRow[],
  env: Env,
  actorUsername?: string | null,
  profile?: Profile
) {
  const site = profile ?? (await getProfile(db, env));
  if (posts.length === 0) {
    return { profile: site, items: [] as ReturnType<typeof mapPost>[] };
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
    profile: site,
    items: posts.map((row) =>
      mapPost(row, site, likesByPost.get(row.id) || [], commentsByPost.get(row.id) || [], env, actorUsername)
    ),
  };
}
