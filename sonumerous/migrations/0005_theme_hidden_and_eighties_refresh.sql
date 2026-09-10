-- Soft-hide non–80s seed templates; refresh 80s cover after prompt change.
ALTER TABLE themes ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;

UPDATE themes
SET hidden = 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id GLOB 'yearbook-90s-*'
   OR id GLOB 'y2k-fashion-*'
   OR id GLOB 'action-figure-*'
   OR id GLOB 'cinematic-poster-*'
   OR id GLOB 'retro-film-*';

UPDATE themes
SET cover_asset_id = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id GLOB 'eighties-*';
