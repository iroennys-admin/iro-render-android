import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, type EnvVar } from '../api/render';
import { toast } from '../ui/Toast';

export default function EnvVarsPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftVal, setDraftVal] = useState('');
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try { setItems(await services.envVars(serviceId)); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const add = async () => {
    if (!draftKey.trim()) return;
    setBusy(true);
    try { await services.setEnvVar(serviceId, draftKey.trim(), draftVal); setDraftKey(''); setDraftVal(''); toast.success('Variable añadida'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const del = async (k: string) => {
    if (!confirm(`¿Borrar variable ${k}?`)) return;
    setBusy(true);
    try { await services.deleteEnvVar(serviceId, k); toast.success('Borrada'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const update = async (k: string, v: string) => {
    setBusy(true);
    try { await services.setEnvVar(serviceId, k, v); toast.success('Actualizada'); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Env vars" sub={`${items.length} variables`}
        actions={<button className="btn-icon" onClick={load}>↻</button>} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Añadir variable</div>
          <input placeholder="KEY" value={draftKey} onChange={e => setDraftKey(e.target.value.toUpperCase())} autoCorrect="off" className="mt-2" />
          <textarea rows={2} placeholder="value" value={draftVal} onChange={e => setDraftVal(e.target.value)} className="mt-2" />
          <button className="btn btn-primary mt-2" onClick={add} disabled={busy || !draftKey.trim()}>+ Añadir</button>
        </div>

        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {!loading && items.length === 0 && <div className="empty"><div className="ico">🔑</div><div className="title">Sin variables</div></div>}
        {items.map(e => (
          <div key={e.key} className="card">
            <div className="row-between">
              <div className="strong mono">{e.key}</div>
              <div className="flex gap-1">
                <button className="btn btn-sm" onClick={() => setReveal(r => ({ ...r, [e.key]: !r[e.key] }))}>{reveal[e.key] ? '🙈' : '👁'}</button>
                <button className="btn btn-sm btn-danger" onClick={() => del(e.key)} disabled={busy}>🗑</button>
              </div>
            </div>
            <textarea rows={2} defaultValue={e.value} onBlur={ev => ev.target.value !== e.value && update(e.key, ev.target.value)}
                      className="mono mt-2" style={{ filter: reveal[e.key] ? 'none' : 'blur(4px)' }} />
          </div>
        ))}
      </div>
    </>
  );
}
