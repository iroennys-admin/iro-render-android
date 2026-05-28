// ============================================================
// IroRender · Render REST API client
//   • Bearer auth (rnd_... API key)
//   • Cursor pagination helpers
//   • Rate-limit capture from headers
//   • Typed `request`/`get`/`post`/`patch`/`put`/`delete`
// Reference: https://api-docs.render.com/reference/
// ============================================================

export const RENDER_API = 'https://api.render.com/v1';

export interface RateLimit { limit: number; remaining: number; reset: number; }
export interface RenderError extends Error {
  status: number;
  body?: any;
  isAuth?: boolean;
  isPayment?: boolean;
  isRateLimit?: boolean;
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
    init: RequestInit & { query?: Record<string, any>; accept?: string; raw?: boolean } = {},
  ): Promise<T> {
    const { query, accept = 'application/json', raw, headers, ...rest } = init;
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
    const reqHeaders: Record<string, string> = { Accept: accept, ...(headers as any) };
    if (this.token) reqHeaders.Authorization = `Bearer ${this.token}`;
    if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)
        && !(init.body instanceof Blob) && typeof init.body !== 'string') {
      reqHeaders['Content-Type'] = 'application/json';
      (rest as any).body = JSON.stringify(init.body);
    }
    const resp = await fetch(url, { ...rest, headers: reqHeaders });

    const lim = resp.headers.get('ratelimit-limit');
    if (lim) {
      this.lastRate = {
        limit: Number(lim),
        remaining: Number(resp.headers.get('ratelimit-remaining') || 0),
        reset: Number(resp.headers.get('ratelimit-reset') || 0),
      };
    }
    if (resp.status === 204) return undefined as any;
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

  /**
   * Render uses {cursor: string} pagination on list endpoints.
   * Most list responses are an array of {cursor, <resource>: {…}} envelopes.
   * Helper iterates pages and unwraps the envelopes.
   */
  async paginate<T = any>(
    path: string, query: Record<string, any> = {}, unwrap = true, maxPages = 5, perPage = 100,
  ): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | undefined; let i = 0;
    while (i < maxPages) {
      const q = { ...query, limit: perPage, cursor };
      const data = await this.get<any[]>(path, q);
      if (!Array.isArray(data) || data.length === 0) break;
      for (const item of data) {
        if (unwrap && item && typeof item === 'object' && 'cursor' in item) {
          const inner = { ...item }; delete (inner as any).cursor;
          // unwrap whatever key (service / deploy / postgres / etc.)
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

// Light helper to unwrap a single page response without pagination.
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
