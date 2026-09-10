export const API = process.env.SONUMEROUS_API ?? 'http://127.0.0.1:8791';

export const INTEGRATION_REQUIRED = process.env.SONUMEROUS_INTEGRATION === '1';

export async function workerReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${API}/api/session`, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function assertWorkerForIntegration(): Promise<void> {
  if (!INTEGRATION_REQUIRED) return;
  const up = await workerReachable();
  if (!up) {
    throw new Error(
      `SONUMEROUS_INTEGRATION=1 but worker is not reachable at ${API}. Start: npm run db:local && npm run dev:api`,
    );
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(`${API}${path}`, init);
  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    data = {} as T;
  }
  return { status: response.status, data };
}

export const tinyPng = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  c => c.charCodeAt(0),
);
