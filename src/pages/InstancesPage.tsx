import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services } from '../api/render';
import { toast } from '../ui/Toast';
import { timeAgo } from '../ui/helpers';

export default function InstancesPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await services.instances(serviceId); setItems(r); setN(r.length || 1); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const scale = async () => {
    setBusy(true);
    try { await services.scale(serviceId, n); toast.success(`Scaled a ${n}`); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Instancias" sub={`${items.length} activas`} actions={<button className="btn-icon" onClick={load}>↻</button>} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Manual scaling</div>
          <div className="flex gap-2 mt-2" style={{ alignItems: 'center' }}>
            <input type="number" min={0} max={20} value={n} onChange={e => setN(Number(e.target.value))} style={{ width: 100 }} />
            <button className="btn btn-primary" onClick={scale} disabled={busy}>Escalar</button>
          </div>
          <div className="muted tiny mt-1">El autoscaling (si está activo) ignora este valor.</div>
        </div>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {items.map(it => (
          <div key={it.id} className="card">
            <div className="strong mono">{it.id}</div>
            <div className="muted small mt-1">creada {timeAgo(it.createdAt)}</div>
            <button className="btn btn-sm btn-danger mt-2" onClick={async () => {
              if (!confirm('¿Reiniciar esta instancia?')) return;
              try { await services.restartInstance(serviceId, it.id); toast.success('Restart enviado'); }
              catch (e: any) { toast.error(e?.message); }
            }}>↻ Restart instance</button>
          </div>
        ))}
      </div>
    </>
  );
}
