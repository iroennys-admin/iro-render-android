import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { blueprints, type Blueprint } from '../api/render';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';

export default function BlueprintsPage() {
  const app = useApp();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    blueprints.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="📋 Blueprints" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.length === 0 && !loading && <div className="empty"><div className="ico">📋</div><div className="title">Sin Blueprints</div></div>}
          {items.map(b => (
            <div key={b.id} className="card">
              <div className="strong">{b.name}</div>
              <div className="muted small">{b.repo} ({b.branch}) · {b.status}</div>
              <button className="btn btn-sm btn-danger mt-2" onClick={async () => {
                if (!confirm(`¿Desconectar blueprint "${b.name}"?`)) return;
                try { await blueprints.disconnect(b.id); toast.success('Desconectado'); }
                catch (e: any) { toast.error(e?.message); }
              }}>Desconectar</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
