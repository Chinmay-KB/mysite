ALTER TABLE themes ADD COLUMN cover_asset_id TEXT REFERENCES assets(id);
ALTER TABLE generations ADD COLUMN purpose TEXT NOT NULL DEFAULT 'user' CHECK(purpose IN ('user', 'theme_cover'));
