// ============================================================
// IroRender · Anti-sleep ping system via GitHub Actions cron
//
// We don't run pings from the phone (Android kills background
// tasks aggressively). Instead, we create/maintain a workflow
// file inside a GitHub repo you own. GitHub Actions hits the
// configured URLs every X minutes for free, 24/7.
//
// What we manage:
//   • A repo we'll call `iro-render-pings` (created on demand)
//   • A file `.github/workflows/ping.yml` with one entry per URL
//   • The user can edit the cron schedule + add/remove URLs
// ============================================================

const GH_API = 'https://api.github.com';
const PING_REPO_NAME = 'iro-render-pings';
const PING_FILE = '.github/workflows/ping.yml';

export interface PingEntry {
  name: string;     // human-friendly name
  url: string;      // full URL to ping (e.g. https://myapi.onrender.com/health)
  enabled: boolean;
}

export interface PingConfig {
  cronEvery: number;       // minutes
  entries: PingEntry[];
}

/** Build the GitHub Actions YAML for the configured pings. */
export function buildWorkflowYaml(cfg: PingConfig): string {
  const minutes = Math.max(5, Math.min(60, cfg.cronEvery || 10));
  // Pick a cron that runs every N minutes (GitHub min is ~5).
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

// ── GitHub API helpers (no Octokit — minimal subset) ────────
async function ghRequest<T = any>(token: string, path: string, init: { method?: string; body?: any } = {}): Promise<T> {
  const url = `${GH_API}${path}`;
  const headers: any = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
  };
  let body: any = init.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const resp = await fetch(url, { ...init, headers, body });
  if (resp.status === 204) return undefined as any;
  const text = await resp.text();
  let data: any; try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
  if (!resp.ok) {
    const msg = (data && data.message) || `HTTP ${resp.status}`;
    const err: any = new Error(msg);
    err.status = resp.status; err.body = data;
    throw err;
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
    // Create the repo (private by default for safety)
    const r = await ghRequest<any>(token, '/user/repos', {
      method: 'POST',
      body: {
        name: PING_REPO_NAME,
        description: 'Auto-managed by IroRender — keeps Render free services awake.',
        private: true,
        auto_init: true,
      },
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

/**
 * Write or replace the ping workflow in the user's repo.
 * Also saves a small JSON sidecar that lets the app re-read the
 * exact config across devices.
 */
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
  // JSON sidecar
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

/** Try to recover an existing config from the user's ping repo. */
export async function fetchRemoteConfig(token: string, login: string): Promise<PingConfig | null> {
  try {
    const { content } = await getFileSha(token, login, PING_REPO_NAME, '.iro-pings.json');
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Trigger a manual run of the ping workflow (for testing). */
export async function dispatchPing(token: string, login: string): Promise<void> {
  await ghRequest(token, `/repos/${login}/${PING_REPO_NAME}/actions/workflows/ping.yml/dispatches`, {
    method: 'POST',
    body: { ref: 'main' },
  });
}

/** Quick in-app HTTP ping test for a single URL. */
export async function quickPing(url: string): Promise<{ ok: boolean; status: number; ms: number; text?: string }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: 'GET' });
    const ms = Date.now() - t0;
    return { ok: r.ok, status: r.status, ms };
  } catch (e: any) {
    return { ok: false, status: 0, ms: Date.now() - t0, text: e?.message };
  }
}
