import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, type CustomDomain } from '../api/render';
import { toast } from '../ui/Toast';

export default function DomainsPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await services.domains(serviceId)); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await services.addDomain(serviceId, name.trim()); setName(''); toast.success('Dominio añadido'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Custom domains" sub={`${items.length}`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Añadir dominio</div>
          <input placeholder="app.midominio.com" value={name} onChange={e => setName(e.target.value)} autoCorrect="off" autoCapitalize="off" className="mt-2" />
          <button className="btn btn-primary mt-2" onClick={add} disabled={busy || !name.trim()}>+ Añadir</button>
        </div>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {items.map(d => (
          <div key={d.id} className="card">
            <div className="row-between">
              <div className="strong">{d.name}</div>
              <span className={`badge ${d.verificationStatus === 'verified' ? 'success' : 'warn'}`}>{d.verificationStatus}</span>
            </div>
            <div className="muted small mt-1">{d.domainType}</div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-sm" onClick={async () => {
                setBusy(true);
                try { await services.verifyDomain(serviceId, d.id); toast.success('Verificación lanzada'); await load(); }
                catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
              }} disabled={busy}>↻ Verificar DNS</button>
              <button className="btn btn-sm btn-danger" onClick={async () => {
                if (!confirm(`¿Borrar ${d.name}?`)) return;
                setBusy(true);
                try { await services.deleteDomain(serviceId, d.id); toast.success('Borrado'); await load(); }
                catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
              }} disabled={busy}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
