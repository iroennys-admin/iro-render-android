import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { keyValue, type KeyValue } from '../api/render';
import { useApp } from '../state/store';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';

export default function KVListPage() {
  const router = useRouter();
  const app = useApp();
  const [items, setItems] = useState<KeyValue[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    keyValue.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="🔑 Key Value" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.length === 0 && !loading && <div className="empty"><div className="ico">🔑</div><div className="title">Sin instancias</div></div>}
          {items.map(k => (
            <div key={k.id} className="card-row" onClick={() => router.push({ name: 'kv', id: k.id })}>
              <span className={`dot ${k.status === 'available' ? 'live' : 'unknown'}`} />
              <div style={{ fontSize: 18 }}>🔑</div>
              <div className="body"><div className="title">{k.name}</div><div className="sub">{k.plan} · {k.region}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
