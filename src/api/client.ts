// ============================================================
// IroRender · Render REST API client
//   • Bearer auth (rnd_... API key)
//   • Cursor pagination helpers
//   • Rate-limit capture from headers
//   • Uses the native bridge on Android (bypasses CORS), falls
//     back to fetch() on web preview.
// Reference: https://api-docs.render.com/reference/
// ============================================================

import { registerPlugin, Capacitor } from '@capacitor/core';

const Bridge = registerPlugin<{
  httpRequest: (opts: { url: string; method: string; body?: string; headers?: Record<string, string>; timeout?: number; }) =>
    Promise<{ status: number; body: string; headers?: Record<string, string>; error?: string; }>;
}>('IroBridge');

function isNative(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export const RENDER_API = 'https://api.render.com/v1';

export interface RateLimit { limit: number; remaining: number; reset: number; }
export interface RenderError extends Error {
  status: number; body?: any;
  isAuth?: boolean; isPayment?: boolean; isRateLimit?: boolean;
}

export class RenderClient {
  token: string | null;
  baseUrl: string;
  lastRate: RateLimit | null = null;

  constructor(token: string | null = null, baseUrl: string = RENDER_API) {
    this.token = token; this.baseUrl = baseUrl;
  }
  setToken(t: string | null) { this.token = t; }
  hasToken() { return !!this.token; }

  async request<T = any>(
    path: string,
    init: { method?: string; body?: any; query?: Record<string, any>; accept?: string; headers?: Record<string, string>; raw?: boolean } = {},
  ): Promise<T> {
    const { method = 'GET', query, accept = 'application/json', headers: extraHeaders, raw } = init;
    let url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    if (query) {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));
        else usp.set(k, String(v));
      }
      const q = usp.toString();
      if (q) url += (url.includes('?') ? '&' : '?') + q;
    }

    // Build headers
    const headers: Record<string, string> = { Accept: accept, ...(extraHeaders || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    // Build body string
    let bodyStr: string | undefined;
    if (init.body !== undefined && init.body !== null) {
      if (typeof init.body === 'string') bodyStr = init.body;
      else if (init.body instanceof FormData) {
        // Browser-only: FormData. On native we fall back to web fetch for these.
        return this.requestViaFetch<T>(url, method, headers, init.body, accept, raw);
      } else {
        headers['Content-Type'] = 'application/json';
        bodyStr = JSON.stringify(init.body);
      }
    }

    // Route through native bridge if available (avoids CORS).
    if (isNative()) {
      let result: { status: number; body: string; headers?: Record<string, string>; error?: string };
      try {
        result = await Bridge.httpRequest({ url, method, body: bodyStr, headers, timeout: 60 });
      } catch (e: any) {
        // Bridge call itself failed (shouldn't happen, but be defensive)
        const err: RenderError = Object.assign(new Error(e?.message || 'Bridge error'), {
          status: 0, body: undefined,
        });
        throw err;
      }

      if (result.status === 0) {
        const err: RenderError = Object.assign(new Error(result.error || 'Network error'), {
          status: 0, body: undefined,
        });
        throw err;
      }

      // Capture rate-limit headers
      const lim = result.headers?.['ratelimit-limit'];
      if (lim) {
        this.lastRate = {
          limit: Number(lim) || 0,
          remaining: Number(result.headers?.['ratelimit-remaining']) || 0,
          reset: Number(result.headers?.['ratelimit-reset']) || 0,
        };
      }

      if (result.status === 204 || result.status === 202) return undefined as any;
      if (raw) return result as any;

      const text = result.body || '';
      const ct = result.headers?.['content-type'] || '';
      const isJson = ct.includes('application/json') || (text.startsWith('{') || text.startsWith('['));
      let data: any = text;
      if (isJson) { try { data = JSON.parse(text); } catch { /* keep as text */ } }

      if (result.status >= 400) {
        const msg = (data && (data.message || data.error)) || `HTTP ${result.status}`;
        const err: RenderError = Object.assign(new Error(msg), {
          status: result.status, body: data,
          isAuth: result.status === 401,
          isPayment: result.status === 402,
          isRateLimit: result.status === 429,
        });
        throw err;
      }
      return data as T;
    }

    // Web preview fallback
    return this.requestViaFetch<T>(url, method, headers, bodyStr, accept, raw);
  }

  private async requestViaFetch<T>(
    url: string, method: string, headers: Record<string, string>, body: any,
    _accept: string, raw?: boolean,
  ): Promise<T> {
    const resp = await fetch(url, { method, headers, body });

    const lim = resp.headers.get('ratelimit-limit');
    if (lim) {
      this.lastRate = {
        limit: Number(lim),
        remaining: Number(resp.headers.get('ratelimit-remaining') || 0),
        reset: Number(resp.headers.get('ratelimit-reset') || 0),
      };
    }
    if (resp.status === 204 || resp.status === 202) return undefined as any;
    if (raw) return resp as any;

    const ct = resp.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const data = isJson ? await resp.json().catch(() => undefined) : await resp.text();

    if (!resp.ok) {
      const err: RenderError = Object.assign(new Error(
        (data && (data.message || data.error)) || `HTTP ${resp.status}`
      ), {
        status: resp.status, body: data,
        isAuth: resp.status === 401,
        isPayment: resp.status === 402,
        isRateLimit: resp.status === 429,
      });
      throw err;
    }
    return data as T;
  }

  get<T = any>(p: string, q?: Record<string, any>) { return this.request<T>(p, { method: 'GET', query: q }); }
  post<T = any>(p: string, body?: any, q?: Record<string, any>) { return this.request<T>(p, { method: 'POST', body, query: q }); }
  patch<T = any>(p: string, body?: any) { return this.request<T>(p, { method: 'PATCH', body }); }
  put<T = any>(p: string, body?: any) { return this.request<T>(p, { method: 'PUT', body }); }
  delete<T = any>(p: string, body?: any) { return this.request<T>(p, { method: 'DELETE', body }); }

  async paginate<T = any>(
    path: string, query: Record<string, any> = {}, unwrapEnvelope = true, maxPages = 5, perPage = 100,
  ): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | undefined; let i = 0;
    while (i < maxPages) {
      const q = { ...query, limit: perPage, cursor };
      const data = await this.get<any[]>(path, q);
      if (!Array.isArray(data) || data.length === 0) break;
      for (const item of data) {
        if (unwrapEnvelope && item && typeof item === 'object' && 'cursor' in item) {
          const inner = { ...item }; delete (inner as any).cursor;
          const keys = Object.keys(inner);
          if (keys.length === 1) all.push(inner[keys[0]]);
          else all.push(inner as any);
        } else all.push(item);
      }
      cursor = (data[data.length - 1] as any)?.cursor;
      if (!cursor) break;
      i++;
    }
    return all;
  }
}

export const render = new RenderClient();

export function unwrap<T = any>(items: any[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.map(x => {
    if (x && typeof x === 'object' && 'cursor' in x) {
      const cp = { ...x }; delete (cp as any).cursor;
      const k = Object.keys(cp);
      return k.length === 1 ? cp[k[0]] : cp;
    }
    return x;
  });
}
