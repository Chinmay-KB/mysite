PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE themes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', prompt TEXT NOT NULL, avoid TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE assets (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('upload','generated','annotation')),
  name TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  bytes INTEGER NOT NULL, sha256 TEXT, favourite INTEGER NOT NULL DEFAULT 0, generation_id TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, sha256, kind)
);
CREATE TABLE generations (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), root_id TEXT NOT NULL, parent_asset_id TEXT REFERENCES assets(id),
  theme_id TEXT, snapshot TEXT NOT NULL, model TEXT NOT NULL, prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','generating','saving','ready','failed')), error TEXT, output_asset_id TEXT REFERENCES assets(id),
  request_key TEXT NOT NULL, attempted_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, request_key)
);
CREATE TABLE edits (id TEXT PRIMARY KEY REFERENCES generations(id), user_id TEXT NOT NULL REFERENCES users(id), parent_asset_id TEXT NOT NULL REFERENCES assets(id), instruction TEXT NOT NULL, preserve_text TEXT NOT NULL, region_json TEXT, annotation_asset_id TEXT REFERENCES assets(id), feedback TEXT CHECK(feedback IN ('kept','rejected')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE preferences (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), text TEXT NOT NULL, theme_id TEXT REFERENCES themes(id), source_edit_id TEXT REFERENCES edits(id), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX assets_owner ON assets(user_id, created_at DESC, id DESC);
CREATE INDEX generations_owner ON generations(user_id, created_at DESC);
CREATE INDEX generations_tree ON generations(user_id, root_id);
CREATE INDEX themes_owner ON themes(user_id);
CREATE INDEX preferences_owner ON preferences(user_id);
CREATE TABLE model_cache (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);
