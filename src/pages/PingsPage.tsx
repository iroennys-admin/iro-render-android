import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { useApp, type PingEntry } from '../state/store';
import { toast } from '../ui/Toast';
import { dispatchPing, fetchRemoteConfig, getCurrentUser, publishPings, quickPing } from '../api/ping';
import { services } from '../api/render';
import { useRouter } from '../state/router';

export default function PingsPage() {
  const app = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(app.settings.pingGithubToken || '');
  const [showToken, setShowToken] = useState(false);
  const [tests, setTests] = useState<Record<string, string>>({});

  const entries = app.settings.pingEntries;
  const cron = app.settings.pingCronMinutes;
  const login = app.settings.pingGithubLogin;

  const setEntries = (list: PingEntry[]) => app.updateSettings({ pingEntries: list });
  const setCron = (n: number) => app.updateSettings({ pingCronMinutes: n });

  const addEntry = (e: PingEntry) => setEntries([...entries, e]);
  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));
  const toggleEntry = (i: number) => setEntries(entries.map((e, idx) => idx === i ? { ...e, enabled: !e.enabled } : e));
  const renameEntry = (i: number, name: string) => setEntries(entries.map((e, idx) => idx === i ? { ...e, name } : e));
  const updateUrl = (i: number, url: string) => setEntries(entries.map((e, idx) => idx === i ? { ...e, url } : e));

  // Convenience: import all your Render web_service URLs
  const importFromRender = async () => {
    setBusy(true);
    try {
      const list = await services.list(app.ownerId ? { ownerId: app.ownerId, type: 'web_service', limit: 100 } : { limit: 100 });
      const seen = new Set(entries.map(e => e.url));
      const added: PingEntry[] = [];
      for (const s of list) {
        const url = s.serviceDetails?.url;
        if (url && !seen.has(url)) added.push({ name: s.name, url, enabled: true });
      }
      if (added.length === 0) toast.info('Nada nuevo que importar');
      else { setEntries([...entries, ...added]); toast.success(`Importados ${added.length} servicios`); }
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const saveToken = async () => {
    if (!token.trim().startsWith('ghp_') && !token.trim().startsWith('github_pat_')) {
      toast.error('Token GitHub no parece válido (ghp_… o github_pat_…)');
      return;
    }
    setBusy(true);
    try {
      const me = await getCurrentUser(token.trim());
      app.updateSettings({ pingGithubToken: token.trim(), pingGithubLogin: me.login });
      toast.success(`GitHub: @${me.login}`);
      // Try to fetch remote config back
      const remote = await fetchRemoteConfig(token.trim(), me.login);
      if (remote) {
        app.updateSettings({ pingEntries: remote.entries, pingCronMinutes: remote.cronEvery });
        toast.info('Cargada configuración remota');
      }
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!app.settings.pingGithubToken || !app.settings.pingGithubLogin) {
      toast.error('Configura tu token de GitHub primero');
      return;
    }
    setBusy(true);
    try {
      const r = await publishPings(app.settings.pingGithubToken, app.settings.pingGithubLogin, {
        cronEvery: cron, entries,
      });
      toast.success('Workflow actualizado en GitHub');
      router.push({ name: 'web-view', url: r.workflowUrl, title: 'Workflow en GitHub' });
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const runNow = async () => {
    if (!app.settings.pingGithubToken || !app.settings.pingGithubLogin) { toast.error('Falta token de GitHub'); return; }
    setBusy(true);
    try { await dispatchPing(app.settings.pingGithubToken, app.settings.pingGithubLogin); toast.success('Workflow lanzado'); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  const testOne = async (i: number, url: string) => {
    setTests(t => ({ ...t, [i]: 'testing' }));
    const r = await quickPing(url);
    setTests(t => ({ ...t, [i]: r.ok ? `✓ ${r.status} · ${r.ms}ms` : `✗ ${r.text || r.status}` }));
  };

  return (
    <>
      <TopBar title="🔔 Anti-sleep pings" showBack={false} sub={`cada ${cron} min · ${entries.filter(e => e.enabled).length} activos`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        {/* Token */}
        <div className="card">
          <div className="strong">1. Conecta GitHub</div>
          <div className="muted small mt-1">Usaremos un repo privado tuyo para correr el cron 24/7 con GitHub Actions (gratis).</div>
          <div className="field mt-2">
            <label>Personal Access Token (scopes: <span className="mono">repo, workflow</span>)</label>
            <div className="flex gap-2">
              <input type={showToken ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)} autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="ghp_…" />
              <button className="btn btn-sm" onClick={() => setShowToken(s => !s)}>{showToken ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={saveToken} disabled={busy || !token.trim()}>
              {busy ? <span className="spinner" /> : (login ? 'Reconectar' : 'Conectar')}
            </button>
            <a className="btn btn-ghost" target="_blank" rel="noreferrer"
               href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=IroRender-Pings">
              🔗 Crear token con scopes correctos
            </a>
          </div>
          {login && <div className="muted small mt-2">Conectado como <span className="strong">@{login}</span></div>}
        </div>

        {/* Settings */}
        <div className="card">
          <div className="strong">2. Intervalo del cron</div>
          <div className="field">
            <label>Cada cuántos minutos (mín. 5)</label>
            <input type="number" min={5} max={60} value={cron} onChange={e => setCron(Math.max(5, Math.min(60, Number(e.target.value) || 10)))} />
            <span className="hint">GitHub Actions limita el cron a un mínimo de ~5 minutos.</span>
          </div>
        </div>

        {/* URLs */}
        <div className="card">
          <div className="row-between">
            <div className="strong">3. URLs a pingear</div>
            <button className="btn btn-sm" onClick={importFromRender} disabled={busy}>📥 Importar de Render</button>
          </div>
          {entries.length === 0 && <div className="muted small mt-2 center">Sin URLs todavía. Importa o añade abajo.</div>}
          {entries.map((e, i) => (
            <div key={i} className="card" style={{ marginTop: 8 }}>
              <div className="row-between">
                <input value={e.name} onChange={ev => renameEntry(i, ev.target.value)} placeholder="Nombre" />
                <div className={`toggle ${e.enabled ? 'on' : ''}`} onClick={() => toggleEntry(i)} style={{ marginLeft: 8 }} />
              </div>
              <input value={e.url} onChange={ev => updateUrl(i, ev.target.value)} placeholder="https://miapp.onrender.com/" className="mt-2 mono small" autoCorrect="off" autoCapitalize="off" />
              <div className="flex gap-2 mt-2">
                <button className="btn btn-sm" onClick={() => testOne(i, e.url)} disabled={!e.url}>🔌 Test</button>
                <button className="btn btn-sm btn-danger" onClick={() => removeEntry(i)}>🗑</button>
                {tests[i] && <span className="muted small">{tests[i]}</span>}
              </div>
            </div>
          ))}
          <button className="btn mt-2" style={{ width: '100%' }} onClick={() => addEntry({ name: 'Ping', url: '', enabled: true })}>+ Añadir URL</button>
        </div>

        {/* Publish */}
        <div className="card">
          <div className="strong">4. Publicar / actualizar</div>
          <div className="muted small mt-1">Esto crea/actualiza un workflow en tu repo privado <span className="mono">iro-render-pings</span> y empieza a correrlo cada {cron} min.</div>
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={publish} disabled={busy || !login || entries.filter(e => e.enabled && e.url).length === 0}>
              {busy ? <span className="spinner" /> : '🚀 Publicar workflow'}
            </button>
            <button className="btn" onClick={runNow} disabled={busy || !login}>▶ Lanzar ahora</button>
          </div>
        </div>

        <div className="muted tiny center mt-2">
          GitHub respeta el cron con ±delay según carga. Tu app no necesita estar abierta.
        </div>
        <div style={{ height: 32 }} />
      </div>
    </>
  );
}
