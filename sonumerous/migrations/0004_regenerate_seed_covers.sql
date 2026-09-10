-- Clear seed template covers so they regenerate with India-specific cover prompts (worker/themeSeeds.ts).
UPDATE themes
SET cover_asset_id = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE cover_asset_id IS NOT NULL
  AND (
    id GLOB 'eighties-*'
    OR id GLOB 'yearbook-90s-*'
    OR id GLOB 'y2k-fashion-*'
    OR id GLOB 'action-figure-*'
    OR id GLOB 'cinematic-poster-*'
    OR id GLOB 'retro-film-*'
  );
