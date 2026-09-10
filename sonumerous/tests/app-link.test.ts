import { describe, expect, it } from 'vitest';
import { APP_BASE, appLink } from '../src/api';

describe('appLink', () => {
  it('leaves API, media, and Access URLs at site root', () => {
    expect(appLink('/api/session')).toBe('/api/session');
    expect(appLink('/media/id/thumb')).toBe('/media/id/thumb');
    expect(appLink('/cdn-cgi/access/logout')).toBe('/cdn-cgi/access/logout');
  });

  it('prefixes other absolute app paths with the Vite base', () => {
    expect(appLink('/settings')).toBe(APP_BASE ? `${APP_BASE}/settings` : '/settings');
  });
});
