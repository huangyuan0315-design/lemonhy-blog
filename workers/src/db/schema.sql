CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  author      TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'approved', 'spam')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_post_slug ON comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

CREATE TABLE IF NOT EXISTS images (
  name        TEXT PRIMARY KEY,
  captured_at TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_images_captured ON images(captured_at);
