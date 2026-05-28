import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { registry, type RegistryCredential } from '../api/render';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';

export default function RegistryPage() {
  const app = useApp();
  const [items, setItems] = useState<RegistryCredential[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    registry.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="🔐 Registry credentials" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.length === 0 && !loading && <div className="empty"><div className="ico">🔐</div><div className="title">Sin credenciales</div></div>}
          {items.map(c => (
            <div key={c.id} className="card">
              <div className="strong">{c.name}</div>
              <div className="muted small">{c.registry} · {c.username}</div>
              <button className="btn btn-sm btn-danger mt-2" onClick={async () => {
                if (!confirm(`¿Borrar credencial "${c.name}"?`)) return;
                try { await registry.delete(c.id); toast.success('Borrada'); setItems(items.filter(x => x.id !== c.id)); }
                catch (e: any) { toast.error(e?.message); }
              }}>🗑 Borrar</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
