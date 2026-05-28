import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { envGroups, type EnvGroup } from '../api/render';
import { useRouter } from '../state/router';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';

export default function EnvGroupsPage() {
  const router = useRouter();
  const app = useApp();
  const [items, setItems] = useState<EnvGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await envGroups.list(app.ownerId || undefined)); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [app.ownerId]);

  const create = async () => {
    if (!name.trim() || !app.ownerId) return;
    setBusy(true);
    try { await envGroups.create({ name: name.trim(), ownerId: app.ownerId }); setName(''); toast.success('Creado'); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Environment groups" sub={`${items.length}`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Crear nuevo</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="shared-secrets" className="mt-2" autoCorrect="off" autoCapitalize="off" />
          <button className="btn btn-primary mt-2" onClick={create} disabled={busy || !name.trim()}>+ Crear</button>
        </div>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {items.map(g => (
          <div key={g.id} className="card-row" onClick={() => router.push({ name: 'env-group', id: g.id })}>
            <div style={{ fontSize: 18 }}>📚</div>
            <div className="body"><div className="title">{g.name}</div><div className="sub mono small">{g.id}</div></div>
          </div>
        ))}
      </div>
    </>
  );
}
