PRAGMA defer_foreign_keys = true;

CREATE TABLE likes_new (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  username TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (post_id, username)
);

INSERT OR IGNORE INTO likes_new (id, post_id, username, nickname, avatar, email, created_at)
SELECT id, post_id, username, nickname, avatar, email, created_at
FROM likes
WHERE username != '';

DROP TABLE likes;
ALTER TABLE likes_new RENAME TO likes;
CREATE INDEX idx_likes_post ON likes (post_id);

CREATE TABLE comments_new (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  username TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  reply_to TEXT,
  reply_to_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

INSERT INTO comments_new (id, post_id, username, nickname, avatar, email, reply_to, reply_to_id, content, created_at)
SELECT id, post_id, username, nickname, avatar, email, reply_to, reply_to_id, content, created_at
FROM comments
WHERE username != '';

DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;
CREATE INDEX idx_comments_post ON comments (post_id, created_at);

PRAGMA defer_foreign_keys = false;
