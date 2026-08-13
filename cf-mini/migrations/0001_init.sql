CREATE TABLE IF NOT EXISTS site_profile (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('moment', 'article')),
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  images_json TEXT NOT NULL DEFAULT '[]',
  video_json TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_type_created ON posts (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pinned_created ON posts (pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  reply_to TEXT,
  reply_to_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  name TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (post_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes (post_id);

INSERT INTO site_profile (id, nickname, avatar, cover, bio, email)
VALUES ('default', '看了', '', '', '记录日常的朋友圈', 'admin@local');

INSERT INTO posts (
  id, type, title, excerpt, cover, category, content, images_json, video_json, pinned, created_at, updated_at
) VALUES (
  'seed-moment-1',
  'moment',
  '',
  '',
  '',
  '',
  '欢迎来到 Cloudflare 缩小版朋友圈。图片、实况图和视频都会存到 R2。',
  '[]',
  NULL,
  1,
  datetime('now'),
  datetime('now')
);

INSERT INTO posts (
  id, type, title, excerpt, cover, category, content, images_json, video_json, pinned, created_at, updated_at
) VALUES (
  'seed-article-1',
  'article',
  '你好，Cloudflare',
  '用 Workers + D1 + R2 跑起来的最小朋友圈。',
  '',
  '随笔',
  '# 你好

这是一篇用 Markdown 写的文章。

- Workers 托管页面和 API
- D1 存动态、文章、评论和点赞
- R2 存图片和视频

后台可以发朋友圈，也可以写长文。',
  '[]',
  NULL,
  0,
  datetime('now'),
  datetime('now')
);
