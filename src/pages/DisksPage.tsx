import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { disks, type Disk } from '../api/render';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';

export default function DisksPage() {
  const app = useApp();
  const [items, setItems] = useState<Disk[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    disks.list(app.ownerId || undefined).then(setItems).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [app.ownerId]);
  return (
    <>
      <TopBar title="💿 Persistent disks" sub={`${items.length}`} />
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.length === 0 && !loading && <div className="empty"><div className="ico">💿</div><div className="title">Sin discos</div></div>}
          {items.map(d => (
            <div key={d.id} className="card">
              <div className="strong">{d.name}</div>
              <div className="muted small">{d.sizeGB} GB · {d.mountPath}</div>
              <div className="muted small mono">service: {d.serviceId}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
