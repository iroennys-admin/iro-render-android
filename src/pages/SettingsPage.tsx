import React from 'react';
import TopBar from '../ui/TopBar';
import { useApp, type Theme } from '../state/store';
import { useRouter } from '../state/router';

const THEMES: { id: Theme; name: string }[] = [
  { id: 'render-dark', name: 'Render Dark' },
  { id: 'midnight',    name: 'Midnight' },
  { id: 'aurora',      name: 'Aurora' },
  { id: 'cyber',       name: 'Cyber' },
];

export default function SettingsPage() {
  const app = useApp();
  const router = useRouter();
  const active = app.owners.find(o => o.id === app.ownerId);
  return (
    <>
      <TopBar title="Ajustes" showBack={false} />
      <div className="scroll-area scroll">
        {/* Account */}
        <div className="card" style={{ margin: 12 }}>
          <div className="strong">Cuenta Render</div>
          {active && <div className="muted small mt-1">{active.name} <span className="dim">({active.email || active.type})</span></div>}
          <div className="field mt-2">
            <label>Workspace activo</label>
            <select value={app.ownerId || ''} onChange={e => app.setOwnerId(e.target.value)}>
              {app.owners.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
            </select>
          </div>
          <button className="btn btn-danger mt-2" style={{ width: '100%' }} onClick={() => {
            if (confirm('¿Cerrar sesión?')) app.logout();
          }}>🚪 Cerrar sesión</button>
        </div>

        {/* Appearance */}
        <div className="card" style={{ margin: 12 }}>
          <div className="strong">Apariencia</div>
          <div className="field mt-2">
            <label>Tema</label>
            <select value={app.settings.theme} onChange={e => app.updateSettings({ theme: e.target.value as Theme })}>
              {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tamaño de fuente: {app.settings.fontSize}px</label>
            <input type="range" min={12} max={20} step={1} value={app.settings.fontSize}
                   onChange={e => app.updateSettings({ fontSize: Number(e.target.value) })} />
          </div>
          <div className="row-between mt-2">
            <div className="strong">Vibración háptica</div>
            <div className={`toggle ${app.settings.hapticFeedback ? 'on' : ''}`}
                 onClick={() => app.updateSettings({ hapticFeedback: !app.settings.hapticFeedback })} />
          </div>
        </div>

        {/* Pings */}
        <div className="card" style={{ margin: 12 }} onClick={() => router.push({ name: 'pings' })}>
          <div className="strong">🔔 Anti-sleep pings</div>
          <div className="muted small mt-1">
            {app.settings.pingEntries.filter(e => e.enabled).length} URLs activas · cada {app.settings.pingCronMinutes} min
            {app.settings.pingGithubLogin && ` · GitHub: @${app.settings.pingGithubLogin}`}
          </div>
        </div>

        {/* About */}
        <div className="card" style={{ margin: 12 }} onClick={() => router.push({ name: 'about' })}>
          <div className="strong">ℹ️ Acerca de IroRender</div>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </>
  );
}
