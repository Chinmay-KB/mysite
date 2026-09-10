import type { Asset, Generation, GenerationInput } from '../shared/types';

/** Vite base (`/app` when the studio is mounted under `/app/`). */
export const APP_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix in-app absolute paths with the deploy base; API, media, and Access URLs stay at site root. */
export function appLink(path: string): string {
  if (!path.startsWith('/')) return path;
  if (path.startsWith('/cdn-cgi/') || path.startsWith('/api') || path.startsWith('/media') || path.startsWith('/public')) {
    return path;
  }
  if (APP_BASE && path.startsWith(`${APP_BASE}/`)) return path;
  return APP_BASE ? `${APP_BASE}${path}` : path;
}

export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }

export type UploadProgress = { loaded: number; total: number; percent: number };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === 'string') headers.set('Content-Type','application/json');
  let response: Response;
  try { response = await fetch(path,{...init,headers,credentials:'same-origin'}); }
  catch { throw new RequestError('You seem to be offline. Reconnect and try again; your saved images are still here.',0); }
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new RequestError('Your session has ended. Reload the studio to sign in again.',401);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new RequestError(data.error ?? 'That didn’t work. Please try again.', response.status);
  return data as T;
}

export async function postGeneration(input: GenerationInput): Promise<Generation> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  let response: Response;
  try {
    response = await fetch('/api/generations', { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(input) });
  } catch {
    throw new RequestError('You seem to be offline. Reconnect and try again; your saved images are still here.', 0);
  }
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new RequestError('Your session has ended. Reload the studio to sign in again.', 401);
  }
  const data = (await response.json()) as Generation & { error?: string };
  if (!response.ok) throw new RequestError(data.error ?? 'That didn’t work. Please try again.', response.status);
  return data;
}

function parseUploadResponse(xhr: XMLHttpRequest): Asset {
  const contentType = xhr.getResponseHeader('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new RequestError('Your session has ended. Reload the studio to sign in again.', 401);
  }
  const data = JSON.parse(xhr.responseText) as Asset & { error?: string };
  if (xhr.status < 200 || xhr.status >= 300) {
    throw new RequestError(data.error ?? 'That didn’t work. Please try again.', xhr.status);
  }
  return data;
}

export function uploadWithProgress(
  file: File | Blob,
  name: string,
  options?: { annotation?: boolean; onProgress?: (progress: UploadProgress) => void; signal?: AbortSignal },
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/assets?name=${encodeURIComponent(name)}${options?.annotation ? '&kind=annotation' : ''}`;
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = event => {
      if (!event.lengthComputable || !options?.onProgress) return;
      options.onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    };
    xhr.onload = () => {
      try {
        resolve(parseUploadResponse(xhr));
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new RequestError('Upload failed. Check your connection and try again.', 0));
    xhr.onabort = () => reject(new RequestError('Upload cancelled.', 0));
    if (options?.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

export async function upload(file: File | Blob, name: string, annotation = false): Promise<Asset> {
  return uploadWithProgress(file, name, { annotation });
}

export const media = (asset: Asset | string, variant = 'preview') => `/media/${typeof asset === 'string' ? asset : asset.id}/${variant}`;
export const navigate = (path: string) => { window.location.hash = path; };
export function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
