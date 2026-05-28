// ============================================================
// IroRender · Anti-sleep ping system via GitHub Actions cron
// ============================================================

import { registerPlugin, Capacitor } from '@capacitor/core';

const Bridge = registerPlugin<{
  httpRequest: (o: { url: string; method: string; body?: string; headers?: Record<string, string>; timeout?: number; }) =>
    Promise<{ status: number; body: string; headers?: Record<string, string>; error?: string; }>;
}>('IroBridge');

function isNative() { try { return Capacitor.isNativePlatform(); } catch { return false; } }

const GH_API = 'https://api.github.com';
const PING_REPO_NAME = 'iro-render-pings';
const PING_FILE = '.github/workflows/ping.yml';

export interface PingEntry { name: string; url: string; enabled: boolean; }
export interface PingConfig { cronEvery: number; entries: PingEntry[]; }

export function buildWorkflowYaml(cfg: PingConfig): string {
  const minutes = Math.max(5, Math.min(60, cfg.cronEvery || 10));
  const cron = `*/${minutes} * * * *`;
  const steps = cfg.entries
    .filter(e => e.enabled && e.url.trim())
    .map((e, i) => {
      const safeName = (e.name || `ping-${i + 1}`).replace(/[^a-zA-Z0-9 ._-]/g, '');
      return [
        `      - name: ${JSON.stringify(safeName)}`,
        `        continue-on-error: true`,
        `        run: |`,
        `          echo "🔔 Pinging ${e.url}"`,
        `          curl -fsS --max-time 30 -o /dev/null -w "↳ HTTP %{http_code}  ⏱ %{time_total}s\\n" "${e.url}" \\`,
        `            -A "IroRender-Ping/1.0 (+https://github.com/iroennys-admin/iro-render-android)"`,
      ].join('\n');
    }).join('\n');

  return `# This file is managed by the IroRender app — edits may be overwritten.
name: 🔔 IroRender Anti-Sleep Pings

on:
  schedule:
    - cron: "${cron}"
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
${steps || '      - run: echo "No URLs configured yet."'}
`;
}

async function ghRequest<T = any>(token: string, path: string, init: { method?: string; body?: any } = {}): Promise<T> {
  const url = `${GH_API}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  };
  let bodyStr: string | undefined;
  if (init.body !== undefined && init.body !== null) {
    if (typeof init.body === 'string') bodyStr = init.body;
    else { headers['Content-Type'] = 'application/json'; bodyStr = JSON.stringify(init.body); }
  }

  let status = 0;
  let text = '';
  if (isNative()) {
    const r = await Bridge.httpRequest({ url, method: init.method || 'GET', body: bodyStr, headers, timeout: 60 });
    status = r.status; text = r.body || '';
    if (status === 0) {
      const err: any = new Error(r.error || 'Network error'); err.status = 0; throw err;
    }
  } else {
    const resp = await fetch(url, { method: init.method || 'GET', headers, body: bodyStr });
    status = resp.status; text = await resp.text();
  }

  if (status === 204) return undefined as any;
  let data: any; try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
  if (status < 200 || status >= 300) {
    const msg = (data && data.message) || `HTTP ${status}`;
    const err: any = new Error(msg); err.status = status; err.body = data; throw err;
  }
  return data;
}

export async function getCurrentUser(token: string): Promise<{ login: string }> {
  return ghRequest(token, '/user');
}

export async function ensurePingRepo(token: string, login: string): Promise<{ owner: string; repo: string; created: boolean; default_branch: string }> {
  try {
    const r = await ghRequest<any>(token, `/repos/${login}/${PING_REPO_NAME}`);
    return { owner: login, repo: PING_REPO_NAME, created: false, default_branch: r.default_branch || 'main' };
  } catch (e: any) {
    if (e.status !== 404) throw e;
    const r = await ghRequest<any>(token, '/user/repos', {
      method: 'POST',
      body: { name: PING_REPO_NAME, description: 'Auto-managed by IroRender — keeps Render free services awake.', private: true, auto_init: true },
    });
    return { owner: login, repo: PING_REPO_NAME, created: true, default_branch: r.default_branch || 'main' };
  }
}

async function getFileSha(token: string, owner: string, repo: string, path: string, ref?: string): Promise<{ sha?: string; content?: string }> {
  try {
    const r: any = await ghRequest(token, `/repos/${owner}/${repo}/contents/${encodeURI(path)}${ref ? `?ref=${ref}` : ''}`);
    let content = '';
    if (r.content) {
      try { content = decodeURIComponent(escape(atob(r.content.replace(/\n/g, '')))); }
      catch { content = atob(r.content.replace(/\n/g, '')); }
    }
    return { sha: r.sha, content };
  } catch (e: any) {
    if (e.status === 404) return {};
    throw e;
  }
}

export async function publishPings(token: string, login: string, cfg: PingConfig): Promise<{ owner: string; repo: string; workflowUrl: string }> {
  const { owner, repo, default_branch } = await ensurePingRepo(token, login);
  const yamlText = buildWorkflowYaml(cfg);
  const yamlExisting = await getFileSha(token, owner, repo, PING_FILE, default_branch);
  await ghRequest(token, `/repos/${owner}/${repo}/contents/${PING_FILE}`, {
    method: 'PUT',
    body: {
      message: 'chore: update IroRender pings',
      content: btoa(unescape(encodeURIComponent(yamlText))),
      sha: yamlExisting.sha,
      branch: default_branch,
    },
  });
  const cfgJson = JSON.stringify(cfg, null, 2);
  const cfgExisting = await getFileSha(token, owner, repo, '.iro-pings.json', default_branch);
  await ghRequest(token, `/repos/${owner}/${repo}/contents/.iro-pings.json`, {
    method: 'PUT',
    body: {
      message: 'chore: update IroRender pings config',
      content: btoa(unescape(encodeURIComponent(cfgJson))),
      sha: cfgExisting.sha,
      branch: default_branch,
    },
  });
  const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/ping.yml`;
  return { owner, repo, workflowUrl };
}

export async function fetchRemoteConfig(token: string, login: string): Promise<PingConfig | null> {
  try {
    const { content } = await getFileSha(token, login, PING_REPO_NAME, '.iro-pings.json');
    if (!content) return null;
    return JSON.parse(content);
  } catch { return null; }
}

export async function dispatchPing(token: string, login: string): Promise<void> {
  await ghRequest(token, `/repos/${login}/${PING_REPO_NAME}/actions/workflows/ping.yml/dispatches`, {
    method: 'POST', body: { ref: 'main' },
  });
}

/** Quick in-app HTTP ping test for a single URL — also uses the bridge on native. */
export async function quickPing(url: string): Promise<{ ok: boolean; status: number; ms: number; text?: string }> {
  const t0 = Date.now();
  try {
    if (isNative()) {
      const r = await Bridge.httpRequest({ url, method: 'GET', timeout: 30 });
      return { ok: r.status >= 200 && r.status < 400, status: r.status, ms: Date.now() - t0, text: r.error };
    }
    const r = await fetch(url, { method: 'GET' });
    return { ok: r.ok, status: r.status, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, status: 0, ms: Date.now() - t0, text: e?.message };
  }
}
