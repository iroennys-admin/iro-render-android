import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, type SecretFile } from '../api/render';
import { toast } from '../ui/Toast';

export default function SecretFilesPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<SecretFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const load = async () => {
    setLoading(true);
    try { setItems(await services.secretFiles(serviceId)); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await services.setSecretFile(serviceId, name.trim(), content); setName(''); setContent(''); toast.success('Archivo guardado'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const del = async (n: string) => {
    if (!confirm(`¿Borrar ${n}?`)) return;
    setBusy(true);
    try { await services.deleteSecretFile(serviceId, n); toast.success('Borrado'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Secret files" sub={`${items.length} archivos`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Añadir / actualizar</div>
          <input placeholder=".env.production" value={name} onChange={e => setName(e.target.value)} className="mt-2" autoCorrect="off" autoCapitalize="off" />
          <textarea rows={6} placeholder="contenido" value={content} onChange={e => setContent(e.target.value)} className="mt-2 mono" />
          <button className="btn btn-primary mt-2" onClick={add} disabled={busy || !name.trim()}>💾 Guardar</button>
        </div>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {items.map(f => (
          <div key={f.name} className="card">
            <div className="row-between">
              <div className="strong mono">{f.name}</div>
              <button className="btn btn-sm btn-danger" onClick={() => del(f.name)} disabled={busy}>🗑</button>
            </div>
            <pre className="mt-2 small" style={{ maxHeight: 200, overflow: 'auto' }}><code>{f.content || ''}</code></pre>
          </div>
        ))}
      </div>
    </>
  );
}
