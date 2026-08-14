import { Hono, type Context } from "hono";
import { sign, verify } from "hono/jwt";
import { ensureDefaultAdmin, type AdminJwt } from "./lib/auth";
import { hashPassword, verifyPassword } from "./lib/crypto";
import {
  beginGithubLogin,
  clearGithubSession,
  finishGithubLogin,
  getActor,
  getGithubUserFromRequest,
  githubConfigured,
} from "./lib/github";
import { buildObjectKey, extFromName, MEDIA_CACHE_CONTROL, publicMediaUrl, rewriteMediaUrl } from "./lib/media";
import { extractMotionPhoto } from "./lib/motion-photo";
import {
  getProfile,
  listPosts,
  loadPostBundle,
  type PostRow,
  type PostImage,
  type PostVideo,
} from "./lib/posts";
import { serveSpa } from "./lib/ssr";

type AppEnv = {
  Bindings: Env;
};

const app = new Hono<AppEnv>();

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".m4v", ".3gp"]);
const IMAGE_MAX = 15 * 1024 * 1024;
const MOTION_MAX = 40 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

app.use("/api/*", async (c, next) => {
  await ensureDefaultAdmin(c.env);
  await next();
});

async function getAdminFromRequest(c: { req: { header: (n: string) => string | undefined }; env: Env }): Promise<AdminJwt | null> {
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !c.env.JWT_SECRET) return null;
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as AdminJwt & { exp?: number; kind?: string };
    if (payload.kind === "github" || !payload.sub || !payload.email) return null;
    return { sub: payload.sub, email: payload.email, nickname: payload.nickname || "" };
  } catch {
    return null;
  }
}

async function postsFor(c: Context, rows: PostRow[]) {
  const actor = await getActor(c, await getAdminFromRequest(c));
  return loadPostBundle(c.env.DB, rows, c.env, actor?.username);
}

app.get("/api/auth/github", (c) => beginGithubLogin(c));
app.get("/api/auth/github/callback", (c) => finishGithubLogin(c));
app.get("/api/auth/github/me", async (c) => {
  if (!githubConfigured(c.env)) return c.json({ user: null, configured: false });
  const user = await getGithubUserFromRequest(c);
  if (!user) return c.json({ user: null, configured: true });
  return c.json({
    configured: true,
    user: {
      id: user.sub,
      login: user.login,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
    },
  });
});
app.post("/api/auth/github/logout", (c) => {
  clearGithubSession(c);
  return c.json({ ok: true });
});

app.get("/api/profile", async (c) => {
  const profile = await getProfile(c.env.DB, c.env);
  return c.json(profile);
});

app.put("/api/profile", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const current = await getProfile(c.env.DB, c.env);
  const body = await c.req.json<{
    nickname?: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    siteTitle?: string;
  }>();
  const nickname = (body.nickname ?? current.nickname).trim() || current.nickname;
  const avatar = body.avatar ?? current.avatar;
  const cover = body.cover ?? current.cover;
  const bio = body.bio ?? current.bio;
  const siteTitle = (body.siteTitle ?? current.siteTitle).trim() || nickname;
  await c.env.DB.prepare(
    "UPDATE site_profile SET nickname = ?, avatar = ?, cover = ?, bio = ?, site_title = ? WHERE id = 'default'"
  )
    .bind(nickname, avatar, cover, bio, siteTitle)
    .run();
  return c.json(await getProfile(c.env.DB, c.env));
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return c.json({ message: "请输入邮箱和密码" }, 400);
  const admin = await c.env.DB.prepare(
    "SELECT id, email, password_hash, nickname FROM admins WHERE email = ?"
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; nickname: string }>();
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return c.json({ message: "邮箱或密码错误" }, 401);
  }
  const token = await sign(
    {
      sub: admin.id,
      email: admin.email,
      nickname: admin.nickname,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    },
    c.env.JWT_SECRET,
    "HS256"
  );
  return c.json({
    token,
    email: admin.email,
    nickname: admin.nickname,
  });
});

app.get("/api/auth/me", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const row = await c.env.DB.prepare("SELECT nickname, email, avatar FROM admins WHERE id = ?")
    .bind(admin.sub)
    .first<{ nickname: string; email: string; avatar: string }>();
  return c.json({
    sub: admin.sub,
    email: row?.email || admin.email,
    nickname: row?.nickname || admin.nickname,
    avatar: rewriteMediaUrl(c.env, row?.avatar || ""),
  });
});

app.put("/api/auth/me", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const current = await c.env.DB.prepare("SELECT nickname, email, avatar FROM admins WHERE id = ?")
    .bind(admin.sub)
    .first<{ nickname: string; email: string; avatar: string }>();
  if (!current) return c.json({ message: "未找到管理员" }, 404);
  const body = await c.req.json<{ nickname?: string; avatar?: string }>();
  const nickname = (body.nickname ?? current.nickname).trim() || current.nickname;
  const avatar = body.avatar ?? current.avatar;
  await c.env.DB.prepare("UPDATE admins SET nickname = ?, avatar = ? WHERE id = ?")
    .bind(nickname, avatar, admin.sub)
    .run();
  return c.json({
    sub: admin.sub,
    email: current.email,
    nickname,
    avatar: rewriteMediaUrl(c.env, avatar || ""),
  });
});

app.post("/api/auth/password", async (c) => {
  const session = await getAdminFromRequest(c);
  if (!session) return c.json({ message: "未登录" }, 401);
  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";
  if (!currentPassword || !newPassword) return c.json({ message: "请填写当前密码和新密码" }, 400);
  if (newPassword.length < 6) return c.json({ message: "新密码至少 6 位" }, 400);
  const admin = await c.env.DB.prepare("SELECT id, password_hash FROM admins WHERE id = ?")
    .bind(session.sub)
    .first<{ id: string; password_hash: string }>();
  if (!admin || !(await verifyPassword(currentPassword, admin.password_hash))) {
    return c.json({ message: "当前密码不正确" }, 400);
  }
  const hash = await hashPassword(newPassword);
  await c.env.DB.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").bind(hash, admin.id).run();
  return c.json({ ok: true });
});

app.get("/api/posts", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || 10)));
  const type = c.req.query("type");
  const actor = await getActor(c, await getAdminFromRequest(c));
  const listed = await listPosts(c.env.DB, c.env, {
    page,
    limit,
    type: type === "moment" || type === "article" ? type : undefined,
    actorUsername: actor?.username,
  });
  return c.json({
    data: listed.items,
    pagination: { page, limit, hasMore: listed.hasMore },
  });
});

app.get("/api/posts/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<PostRow>();
  if (!row) return c.json({ message: "未找到" }, 404);
  const bundle = await postsFor(c, [row]);
  return c.json(bundle.items[0]);
});

app.post("/api/posts", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const body = await c.req.json<{
    type?: "moment" | "article";
    title?: string;
    excerpt?: string;
    cover?: string;
    category?: string;
    content?: string;
    images?: PostImage[];
    video?: PostVideo | null;
    pinned?: boolean;
    createdAt?: string;
  }>();
  const type = body.type === "article" ? "article" : "moment";
  const now = new Date().toISOString();
  const createdAt = parseCreatedAt(body.createdAt);
  if (body.createdAt && !createdAt) return c.json({ message: "发布时间无效" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO posts (id, type, title, excerpt, cover, category, content, images_json, video_json, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      type,
      body.title || "",
      body.excerpt || excerptFrom(body.content || ""),
      body.cover || "",
      body.category || "",
      body.content || "",
      JSON.stringify(body.images || []),
      body.video ? JSON.stringify(body.video) : null,
      body.pinned ? 1 : 0,
      createdAt || now,
      now
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  const bundle = await postsFor(c, row ? [row] : []);
  return c.json(bundle.items[0], 201);
});

app.put("/api/posts/:id", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  if (!existing) return c.json({ message: "未找到" }, 404);
  const body = await c.req.json<{
    title?: string;
    excerpt?: string;
    cover?: string;
    category?: string;
    content?: string;
    images?: PostImage[];
    video?: PostVideo | null;
    pinned?: boolean;
    createdAt?: string;
  }>();
  const createdAt = parseCreatedAt(body.createdAt);
  if (body.createdAt && !createdAt) return c.json({ message: "发布时间无效" }, 400);
  const content = body.content ?? existing.content;
  await c.env.DB.prepare(
    `UPDATE posts SET title = ?, excerpt = ?, cover = ?, category = ?, content = ?, images_json = ?, video_json = ?, pinned = ?, created_at = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.title ?? existing.title,
      body.excerpt ?? excerptFrom(content),
      body.cover ?? existing.cover,
      body.category ?? existing.category,
      content,
      JSON.stringify(body.images ?? JSON.parse(existing.images_json || "[]")),
      body.video === undefined
        ? existing.video_json
        : body.video
          ? JSON.stringify(body.video)
          : null,
      body.pinned === undefined ? existing.pinned : body.pinned ? 1 : 0,
      createdAt || existing.created_at,
      new Date().toISOString(),
      id
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  const bundle = await postsFor(c, row ? [row] : []);
  return c.json(bundle.items[0]);
});

app.delete("/api/posts/:id", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const id = c.req.param("id");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM likes WHERE post_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM comments WHERE post_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});

app.patch("/api/posts/:id/pin", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const id = c.req.param("id");
  const body = await c.req.json<{ pinned?: boolean }>();
  const res = await c.env.DB.prepare("UPDATE posts SET pinned = ?, updated_at = ? WHERE id = ?")
    .bind(body.pinned ? 1 : 0, new Date().toISOString(), id)
    .run();
  if (!res.meta.changes) return c.json({ message: "未找到" }, 404);
  return c.json({ pinned: !!body.pinned });
});

app.post("/api/posts/:id/likes", async (c) => {
  const actor = await getActor(c, await getAdminFromRequest(c));
  if (!actor) return c.json({ message: "请先登录 GitHub" }, 401);
  const id = c.req.param("id");
  const post = await c.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return c.json({ message: "未找到" }, 404);
  const existing = await c.env.DB.prepare(
    "SELECT id FROM likes WHERE post_id = ? AND username = ?"
  )
    .bind(id, actor.username)
    .first();
  if (existing) {
    await c.env.DB.prepare("DELETE FROM likes WHERE post_id = ? AND username = ?")
      .bind(id, actor.username)
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO likes (id, post_id, username, nickname, avatar, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        id,
        actor.username,
        actor.nickname,
        actor.avatar,
        actor.email,
        new Date().toISOString()
      )
      .run();
  }
  const likes = await c.env.DB.prepare(
    "SELECT nickname FROM likes WHERE post_id = ? ORDER BY created_at ASC"
  )
    .bind(id)
    .all<{ nickname: string }>();
  return c.json({
    liked: !existing,
    likes: (likes.results || []).map((l) => ({ name: l.nickname })),
  });
});

app.post("/api/posts/:id/comments", async (c) => {
  const actor = await getActor(c, await getAdminFromRequest(c));
  if (!actor) return c.json({ message: "请先登录 GitHub" }, 401);
  const id = c.req.param("id");
  const post = await c.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return c.json({ message: "未找到" }, 404);
  const body = await c.req.json<{
    content?: string;
    replyTo?: string;
    replyToId?: string;
  }>();
  const content = (body.content || "").trim();
  if (!content) return c.json({ message: "请填写评论" }, 400);
  const commentId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO comments (id, post_id, username, nickname, avatar, email, reply_to, reply_to_id, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      commentId,
      id,
      actor.username,
      actor.nickname,
      actor.avatar,
      actor.email,
      body.replyTo || null,
      body.replyToId || null,
      content,
      createdAt
    )
    .run();
  return c.json({
    id: commentId,
    author: actor.nickname,
    avatar: rewriteMediaUrl(c.env, actor.avatar || ""),
    email: actor.email || undefined,
    replyTo: body.replyTo || undefined,
    replyToId: body.replyToId || undefined,
    content,
    createdAt,
    mine: true,
  });
});

app.delete("/api/posts/:id/comments/:commentId", async (c) => {
  const admin = await getAdminFromRequest(c);
  const actor = await getActor(c, admin);
  if (!actor) return c.json({ message: "请先登录 GitHub" }, 401);
  const postId = c.req.param("id");
  const commentId = c.req.param("commentId");
  const comment = await c.env.DB.prepare("SELECT id, username FROM comments WHERE id = ? AND post_id = ?")
    .bind(commentId, postId)
    .first<{ id: string; username: string }>();
  if (!comment) return c.json({ message: "未找到" }, 404);
  if (!admin) {
    const username = (comment.username || "").trim();
    if (!username || username !== actor.username) {
      return c.json({ message: "只能删除自己的评论" }, 403);
    }
  }
  await c.env.DB.prepare("DELETE FROM comments WHERE id = ? AND post_id = ?")
    .bind(commentId, postId)
    .run();
  return c.json({ ok: true });
});

app.post("/api/upload", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  return uploadOne(c, "image", IMAGE_EXTS, IMAGE_MAX, ".jpg");
});

app.post("/api/upload/video", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  return uploadOne(c, "video", VIDEO_EXTS, VIDEO_MAX, ".mp4");
});

app.post("/api/upload/motion-photo", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const file = await readFile(c);
  if (!file) return c.json({ message: "请选择文件" }, 400);
  if (file.size > MOTION_MAX) return c.json({ message: "实况图不能超过 40MB" }, 400);
  const buf = new Uint8Array(await file.arrayBuffer());
  const extracted = extractMotionPhoto(buf);
  if (!extracted) {
    const ext = extFromName(file.name, ".jpg");
    const mime =
      file.type ||
      (ext === ".heic" || ext === ".heif" ? "image/heic" : "image/jpeg");
    const key = buildObjectKey("image", ext);
    await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: mime, cacheControl: MEDIA_CACHE_CONTROL } });
    return c.json({ src: publicMediaUrl(c.env, key), video: undefined, live: false });
  }
  const imageExt = extracted.imageMime === "image/heic" ? ".heic" : ".jpg";
  const videoExt = extracted.videoMime === "video/quicktime" ? ".mov" : ".mp4";
  const imageKey = buildObjectKey("live", imageExt);
  const videoKey = buildObjectKey("live", videoExt);
  await Promise.all([
    c.env.MEDIA.put(imageKey, extracted.image, { httpMetadata: { contentType: extracted.imageMime, cacheControl: MEDIA_CACHE_CONTROL } }),
    c.env.MEDIA.put(videoKey, extracted.video, { httpMetadata: { contentType: extracted.videoMime, cacheControl: MEDIA_CACHE_CONTROL } }),
  ]);
  return c.json({
    src: publicMediaUrl(c.env, imageKey),
    video: publicMediaUrl(c.env, videoKey),
    live: true,
  });
});

app.get("/api/media/*", async (c) => {
  const key = c.req.path.replace("/api/media/", "");
  if (!key || key.includes("..")) return c.json({ message: "无效路径" }, 400);
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ message: "Not Found" }, 404);
  return c.text("Not Found", 404);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: err instanceof Error ? err.message : "服务器错误" }, 500);
});

function excerptFrom(content: string): string {
  return content.replace(/[#>*_`\-\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function parseCreatedAt(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return d.toISOString();
}

async function readFile(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }): Promise<File | null> {
  const body = await c.req.parseBody();
  const file = body.file;
  return file instanceof File ? file : null;
}

async function uploadOne(
  c: { env: Env; req: { parseBody: () => Promise<Record<string, unknown>> } },
  kind: "image" | "video",
  exts: Set<string>,
  max: number,
  fallbackExt: string
) {
  const file = await readFile(c);
  if (!file) return Response.json({ message: "请选择文件" }, { status: 400 });
  if (file.size > max) {
    return Response.json({ message: `文件不能超过 ${Math.round(max / 1024 / 1024)}MB` }, { status: 400 });
  }
  const ext = extFromName(file.name, fallbackExt);
  if (!exts.has(ext)) {
    return Response.json({ message: "不支持的文件类型" }, { status: 400 });
  }
  const key = buildObjectKey(kind, ext);
  await c.env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      cacheControl: MEDIA_CACHE_CONTROL,
    },
  });
  const url = publicMediaUrl(c.env, key);
  return Response.json({ url, key });
}

const EMPTY_ICON_PATHS = new Set(["/favicon.ico", "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"]);

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
`;

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/robots.txt") {
      return new Response(ROBOTS_TXT, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    if (EMPTY_ICON_PATHS.has(url.pathname)) {
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    return serveSpa(request, env);
  },
} satisfies ExportedHandler<Env>;
