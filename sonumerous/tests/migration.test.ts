import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

describe('database migrations', () => {
  it('0002 adds theme cover_asset_id and generation purpose', () => {
    const sql = readFileSync(join(migrationsDir, '0002_theme_covers.sql'), 'utf8');
    expect(sql).toMatch(/cover_asset_id/);
    expect(sql).toMatch(/purpose/);
    expect(sql).toMatch(/theme_cover/);
  });

  it('0004 clears seed theme covers for regeneration', () => {
    const sql = readFileSync(join(migrationsDir, '0004_regenerate_seed_covers.sql'), 'utf8');
    expect(sql).toMatch(/cover_asset_id = NULL/);
    expect(sql).toMatch(/eighties-\*/);
    expect(sql).toMatch(/retro-film-\*/);
  });

  it('0005 adds hidden and soft-hides non-80s seeds', () => {
    const sql = readFileSync(join(migrationsDir, '0005_theme_hidden_and_eighties_refresh.sql'), 'utf8');
    expect(sql).toMatch(/ADD COLUMN hidden/);
    expect(sql).toMatch(/hidden = 1/);
    expect(sql).toMatch(/yearbook-90s-\*/);
    expect(sql).toMatch(/eighties-\*/);
    expect(sql).toMatch(/cover_asset_id = NULL/);
  });

  it('0006 adds default_aspect with 1:1 default', () => {
    const sql = readFileSync(join(migrationsDir, '0006_theme_default_aspect.sql'), 'utf8');
    expect(sql).toMatch(/default_aspect/);
    expect(sql).toMatch(/DEFAULT '1:1'/);
  });

  it('0007 creates five stable global seed themes and preserves user scope', () => {
    const sql = readFileSync(join(migrationsDir, '0007_global_seed_themes.sql'), 'utf8');
    expect(sql).toMatch(/ADD COLUMN scope TEXT NOT NULL DEFAULT 'user'/);
    expect(sql).toMatch(/'theme:eighties'/);
    expect(sql).toMatch(/'theme:studio'/);
    expect(sql).toMatch(/'theme:scribbles'/);
    expect(sql).toMatch(/'theme:fix-lighting'/);
    expect(sql).toMatch(/'theme:wanderlust'/);
    expect(sql.match(/'global'/g)).toHaveLength(6);
    expect(sql).toMatch(/INSERT OR IGNORE INTO themes/);
  });
});
