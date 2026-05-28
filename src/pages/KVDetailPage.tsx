import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { keyValue, type KeyValue } from '../api/render';
import { toast } from '../ui/Toast';

export default function KVDetailPage({ id }: { id: string }) {
  const [k, setK] = useState<KeyValue | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => keyValue.get(id).then(setK).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, [id]);
  const action = async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); toast.success(label); load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  if (!k) return (<><TopBar title="Key Value" /><div className="loading"><span className="spinner" /> Cargando…</div></>);
  return (
    <>
      <TopBar title={k.name} sub={`${k.plan} · ${k.region}`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">{k.name}</div>
          <div className="muted small">{k.status}</div>
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            {k.status === 'suspended'
              ? <button className="btn btn-primary" onClick={() => action('Resumed', () => keyValue.resume(id))} disabled={busy}>▶ Resume</button>
              : <button className="btn btn-warn" onClick={() => action('Suspended', () => keyValue.suspend(id))} disabled={busy}>⏸ Suspend</button>}
            <button className="btn btn-danger" onClick={() => {
              if (!confirm(`¿BORRAR Key-Value "${k.name}"?`)) return;
              action('Borrado', () => keyValue.delete(id));
            }} disabled={busy}>🗑 Borrar</button>
          </div>
        </div>
      </div>
    </>
  );
}
