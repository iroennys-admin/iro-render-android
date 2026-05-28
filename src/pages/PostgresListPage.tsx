import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { postgres, type Postgres } from '../api/render';
import { useApp } from '../state/store';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';

export default function PostgresListPage() {
  const router = useRouter();
  const app = useApp();
  const [items, setItems] = useState<Postgres[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    postgres.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="🐘 Postgres" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {!loading && items.length === 0 && <div className="empty"><div className="ico">🐘</div><div className="title">Sin instancias</div></div>}
          {items.map(p => (
            <div key={p.id} className="card-row" onClick={() => router.push({ name: 'postgres', id: p.id })}>
              <span className={`dot ${p.status === 'available' ? 'live' : p.status === 'suspended' ? 'suspended' : 'building'}`} />
              <div style={{ fontSize: 18 }}>🐘</div>
              <div className="body">
                <div className="title truncate">{p.name}</div>
                <div className="sub truncate">{p.plan} · v{p.version} · {p.region} · {p.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
