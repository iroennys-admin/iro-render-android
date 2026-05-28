import React, { useState } from 'react';
import { useApp } from '../state/store';
import { render } from '../api/client';
import { owners } from '../api/render';
import { toast } from '../ui/Toast';

export default function LoginScreen() {
  const app = useApp();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!key.trim().startsWith('rnd_')) {
      toast.error('La API key debe empezar por "rnd_"');
      return;
    }
    setBusy(true);
    try {
      render.setToken(key.trim());
      const list = await owners.list();
      if (!list.length) throw new Error('No se encontraron workspaces');
      app.setOwners(list);
      app.setOwnerId(list[0].id);
      app.setApiKey(key.trim());
      toast.success(`Conectado · ${list[0].name}`);
    } catch (e: any) {
      render.setToken(null);
      toast.error(e?.message || 'API key inválida');
    } finally { setBusy(false); }
  };

  const openBrowser = (url: string) => { try { window.open(url, '_blank', 'noopener'); } catch {} };

  return (
    <div className="login-wrap">
      <div className="login-logo">📡</div>
      <div className="login-title">IroRender</div>
      <div className="login-sub mt-2">
        Gestiona tus servicios de <b>Render.com</b> desde Android — deploys, logs, env vars y ping anti-sleep automático.
      </div>

      <div style={{ width: '100%', maxWidth: 360, marginTop: 24 }}>
        <div className="field">
          <label>Render API Key</label>
          <input type="password" placeholder="rnd_..."
                 value={key} onChange={e => setKey(e.target.value)}
                 autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          <span className="hint">La key se guarda solo en tu dispositivo. Empieza por <b>rnd_</b>.</span>
        </div>
        <button className="btn btn-primary mt-2" style={{ width: '100%' }} onClick={connect} disabled={busy || !key.trim()}>
          {busy ? <span className="spinner" /> : 'Conectar'}
        </button>
        <button className="btn btn-ghost mt-2" style={{ width: '100%' }} onClick={() => openBrowser('https://dashboard.render.com/account/api-keys')}>
          🔗 Crear / ver mis API keys
        </button>
        <div className="dim tiny center mt-4">
          Render no ofrece OAuth público todavía — la API key es lo oficial.
        </div>
      </div>
    </div>
  );
}
