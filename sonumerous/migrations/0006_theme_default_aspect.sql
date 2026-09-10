-- Per-template default generation aspect (create modal uses this; no UI control).
ALTER TABLE themes ADD COLUMN default_aspect TEXT NOT NULL DEFAULT '1:1';
