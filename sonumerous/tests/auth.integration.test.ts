import { describe, expect, it } from 'vitest';
import { identity } from '../worker/core';
import type { AppEnv } from '../worker/core';

describe('production auth fail-closed', () => {
  const prodEnv = {
    LOCAL_DEV: 'false',
    ACCESS_DOMAIN: 'getcovidhelp-pages.cloudflareaccess.com',
    ACCESS_AUD: '575acf76b7885421927f4d0ec18f49132eb361cdeff82f67bce45e5b888970f5',
  } as AppEnv;

  it('rejects unauthenticated API access without Access JWT', async () => {
    const request = new Request('https://sonumerous.chinmaykabi.com/api/themes');
    const user = await identity(request, prodEnv);
    expect(user).toBeNull();
  });

  it('allows loopback only when LOCAL_DEV is true', async () => {
    const request = new Request('http://127.0.0.1:8791/api/session');
    const user = await identity(request, { ...prodEnv, LOCAL_DEV: 'true' } as AppEnv);
    expect(user).toEqual({ id: 'local-user', email: 'studio@localhost' });
  });
});
