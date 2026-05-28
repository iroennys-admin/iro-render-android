import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { projects, environments, type Project, type Environment } from '../api/render';
import { toast } from '../ui/Toast';

export default function ProjectDetailPage({ id }: { id: string }) {
  const [p, setP] = useState<Project | null>(null);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [pj, e] = await Promise.all([projects.get(id), projects.environments(id)]);
      setP(pj); setEnvs(e);
    } catch (er: any) { toast.error(er?.message); }
  };
  useEffect(() => { load(); }, [id]);

  const addEnv = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await environments.create(id, { name: name.trim() }); setName(''); toast.success('Environment creado'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  if (!p) return (<><TopBar title="Project" /><div className="loading"><span className="spinner" /> Cargando…</div></>);
  return (
    <>
      <TopBar title={p.name} sub="Project" />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Crear environment</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="prod / staging / dev" className="mt-2" autoCorrect="off" autoCapitalize="off" />
          <button className="btn btn-primary mt-2" onClick={addEnv} disabled={busy || !name.trim()}>+ Crear</button>
        </div>
        <div className="section-title">Environments</div>
        {envs.map(e => (
          <div key={e.id} className="card-row">
            <div style={{ fontSize: 18 }}>🌍</div>
            <div className="body"><div className="title">{e.name}</div><div className="sub mono small">{e.id}</div></div>
            <button className="btn btn-sm btn-danger" onClick={async () => {
              if (!confirm(`¿Borrar environment "${e.name}"? (debe estar vacío)`)) return;
              try { await environments.delete(e.id); toast.success('Borrado'); await load(); }
              catch (er: any) { toast.error(er?.message); }
            }}>🗑</button>
          </div>
        ))}
      </div>
    </>
  );
}
