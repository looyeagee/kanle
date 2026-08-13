import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { ensureDefaultAdmin, type AdminJwt } from "./lib/auth";
import { verifyPassword } from "./lib/crypto";
import { buildObjectKey, extFromName, publicMediaUrl } from "./lib/media";
import { extractMotionPhoto } from "./lib/motion-photo";
import {
  getProfile,
  loadPostBundle,
  type PostRow,
  type PostImage,
  type PostVideo,
} from "./lib/posts";

type AppEnv = {
  Bindings: Env;
  Variables: {
    visitorId: string;
    admin?: AdminJwt;
  };
};

const app = new Hono<AppEnv>();

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".m4v", ".3gp"]);
const IMAGE_MAX = 15 * 1024 * 1024;
const MOTION_MAX = 40 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

app.use("/api/*", async (c, next) => {
  await ensureDefaultAdmin(c.env);
  let visitorId = getCookie(c, "visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    setCookie(c, "visitor_id", visitorId, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "Lax",
    });
  }
  c.set("visitorId", visitorId);
  await next();
});

async function getAdminFromRequest(c: { req: { header: (n: string) => string | undefined }; env: Env }): Promise<AdminJwt | null> {
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !c.env.JWT_SECRET) return null;
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as AdminJwt & { exp?: number };
    if (!payload.sub || !payload.email) return null;
    return { sub: payload.sub, email: payload.email, nickname: payload.nickname || "" };
  } catch {
    return null;
  }
}

app.get("/api/profile", async (c) => {
  const profile = await getProfile(c.env.DB);
  return c.json(profile);
});

app.put("/api/profile", async (c) => {
  const admin = await getAdminFromRequest(c);
  if (!admin) return c.json({ message: "未登录" }, 401);
  const body = await c.req.json<{ nickname?: string; avatar?: string; cover?: string; bio?: string }>();
  await c.env.DB.prepare(
    "UPDATE site_profile SET nickname = ?, avatar = ?, cover = ?, bio = ? WHERE id = 'default'"
  )
    .bind(body.nickname ?? "", body.avatar ?? "", body.cover ?? "", body.bio ?? "")
    .run();
  return c.json(await getProfile(c.env.DB));
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
  return c.json(admin);
});

app.get("/api/posts", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || 10)));
  const type = c.req.query("type");
  const offset = (page - 1) * limit;
  const visitorId = c.get("visitorId");

  const stmt =
    type === "moment" || type === "article"
      ? c.env.DB.prepare(
          "SELECT * FROM posts WHERE type = ? ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?"
        ).bind(type, limit + 1, offset)
      : c.env.DB.prepare(
          "SELECT * FROM posts ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?"
        ).bind(limit + 1, offset);
  const rows = await stmt.all<PostRow>();
  const list = rows.results || [];
  const hasMore = list.length > limit;
  const pageRows = hasMore ? list.slice(0, limit) : list;
  const bundle = await loadPostBundle(c.env.DB, pageRows, visitorId);
  return c.json({
    data: bundle.items,
    pagination: { page, limit, hasMore },
  });
});

app.get("/api/posts/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id)
    .first<PostRow>();
  if (!row) return c.json({ message: "未找到" }, 404);
  const bundle = await loadPostBundle(c.env.DB, [row], c.get("visitorId"));
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
  }>();
  const type = body.type === "article" ? "article" : "moment";
  const now = new Date().toISOString();
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
      now,
      now
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  const bundle = await loadPostBundle(c.env.DB, row ? [row] : [], c.get("visitorId"));
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
  }>();
  const content = body.content ?? existing.content;
  await c.env.DB.prepare(
    `UPDATE posts SET title = ?, excerpt = ?, cover = ?, category = ?, content = ?, images_json = ?, video_json = ?, pinned = ?, updated_at = ?
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
      new Date().toISOString(),
      id
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  const bundle = await loadPostBundle(c.env.DB, row ? [row] : [], c.get("visitorId"));
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
  const id = c.req.param("id");
  const visitorId = c.get("visitorId");
  const post = await c.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return c.json({ message: "未找到" }, 404);
  const body = await c.req.json<{ name?: string }>().catch(() => ({ name: "访客" }));
  const name = (body.name || "访客").trim() || "访客";
  const existing = await c.env.DB.prepare(
    "SELECT id FROM likes WHERE post_id = ? AND visitor_id = ?"
  )
    .bind(id, visitorId)
    .first();
  if (existing) {
    await c.env.DB.prepare("DELETE FROM likes WHERE post_id = ? AND visitor_id = ?")
      .bind(id, visitorId)
      .run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO likes (id, post_id, name, visitor_id, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(crypto.randomUUID(), id, name, visitorId, new Date().toISOString())
      .run();
  }
  const likes = await c.env.DB.prepare("SELECT name FROM likes WHERE post_id = ? ORDER BY created_at ASC")
    .bind(id)
    .all<{ name: string }>();
  return c.json({
    liked: !existing,
    likes: (likes.results || []).map((l) => ({ name: l.name })),
  });
});

app.post("/api/posts/:id/comments", async (c) => {
  const id = c.req.param("id");
  const post = await c.env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!post) return c.json({ message: "未找到" }, 404);
  const body = await c.req.json<{
    authorName?: string;
    email?: string;
    content?: string;
    replyTo?: string;
    replyToId?: string;
  }>();
  const authorName = (body.authorName || "").trim();
  const content = (body.content || "").trim();
  if (!authorName) return c.json({ message: "请填写昵称" }, 400);
  if (!content) return c.json({ message: "请填写评论" }, 400);
  const commentId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO comments (id, post_id, author_name, email, reply_to, reply_to_id, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      commentId,
      id,
      authorName,
      (body.email || "").trim(),
      body.replyTo || null,
      body.replyToId || null,
      content,
      createdAt
    )
    .run();
  return c.json({
    id: commentId,
    author: authorName,
    email: body.email || undefined,
    replyTo: body.replyTo || undefined,
    replyToId: body.replyToId || undefined,
    content,
    createdAt,
  });
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
    const key = buildObjectKey("image", extFromName(file.name, ".jpg"));
    await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: file.type || "image/jpeg" } });
    return c.json({ src: publicMediaUrl(c.env, key), video: undefined, live: false });
  }
  const imageKey = buildObjectKey("live", ".jpg");
  const videoKey = buildObjectKey("live", ".mp4");
  await Promise.all([
    c.env.MEDIA.put(imageKey, extracted.image, { httpMetadata: { contentType: extracted.imageMime } }),
    c.env.MEDIA.put(videoKey, extracted.video, { httpMetadata: { contentType: extracted.videoMime } }),
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
    httpMetadata: { contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg") },
  });
  const url = publicMediaUrl(c.env, key);
  return Response.json({ url, key });
}

export default app;
