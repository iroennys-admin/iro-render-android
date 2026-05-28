import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { envGroups, type EnvGroup } from '../api/render';
import { toast } from '../ui/Toast';

export default function EnvGroupDetailPage({ id }: { id: string }) {
  const [g, setG] = useState<EnvGroup | null>(null);
  const [k, setK] = useState(''); const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => envGroups.get(id).then(setG).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, [id]);

  const addVar = async () => {
    if (!k.trim()) return;
    setBusy(true);
    try { await envGroups.setEnvVar(id, k.trim(), v); setK(''); setV(''); toast.success('Guardado'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!confirm(`¿Borrar el grupo "${g?.name}"?`)) return;
    try { await envGroups.delete(id); toast.success('Borrado'); history.back(); }
    catch (e: any) { toast.error(e?.message); }
  };

  if (!g) return (<><TopBar title="Env group" /><div className="loading"><span className="spinner" /> Cargando…</div></>);
  return (
    <>
      <TopBar title={g.name} sub="Env group" actions={<button className="btn-icon" onClick={del}>🗑</button>} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Añadir variable</div>
          <input placeholder="KEY" value={k} onChange={e => setK(e.target.value.toUpperCase())} autoCorrect="off" className="mt-2" />
          <textarea rows={2} placeholder="value" value={v} onChange={e => setV(e.target.value)} className="mt-2" />
          <button className="btn btn-primary mt-2" onClick={addVar} disabled={busy || !k.trim()}>+ Guardar</button>
        </div>
        <div className="section-title">Variables ({g.envVars?.length || 0})</div>
        {g.envVars?.map(v => (
          <div key={v.key} className="card">
            <div className="row-between">
              <div className="strong mono">{v.key}</div>
              <button className="btn btn-sm btn-danger" onClick={async () => {
                try { await envGroups.deleteEnvVar(id, v.key); toast.success('Borrada'); await load(); }
                catch (e: any) { toast.error(e?.message); }
              }}>🗑</button>
            </div>
            <pre className="mt-2 small mono" style={{ whiteSpace: 'pre-wrap' }}>{v.value}</pre>
          </div>
        ))}
      </div>
    </>
  );
}
