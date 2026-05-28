import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, deploys, type Service, type Deploy, type ServiceType } from '../api/render';
import { useRouter } from '../state/router';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';
import { serviceTypeIcon, serviceTypeLabel, suspendedDot, timeAgo } from '../ui/helpers';

const TYPES: { id: ServiceType | 'all'; label: string }[] = [
  { id: 'all',                label: 'Todos' },
  { id: 'web_service',        label: 'Web' },
  { id: 'static_site',        label: 'Static' },
  { id: 'background_worker',  label: 'Worker' },
  { id: 'cron_job',           label: 'Cron' },
  { id: 'private_service',    label: 'Private' },
];

export default function ServicesPage() {
  const router = useRouter();
  const app = useApp();
  const [items, setItems] = useState<Service[]>([]);
  const [filter, setFilter] = useState<'all' | ServiceType>('all');
  const [q, setQ] = useState('');
  const [lastDeploys, setLastDeploys] = useState<Record<string, Deploy | null>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await services.list(app.ownerId ? { ownerId: app.ownerId, limit: 200 } : { limit: 200 });
      setItems(all);
      const last = await Promise.allSettled(all.map(s => deploys.list(s.id, { limit: 1 })));
      const map: Record<string, Deploy | null> = {};
      all.forEach((s, i) => {
        const r = last[i];
        map[s.id] = r.status === 'fulfilled' ? (r.value[0] || null) : null;
      });
      setLastDeploys(map);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [app.ownerId]);

  const filtered = items
    .filter(s => filter === 'all' || s.type === filter)
    .filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <TopBar title="Servicios" sub={`${filtered.length} de ${items.length}`} showBack={false}
              actions={<>
                <button className="btn-icon" onClick={load}>↻</button>
                <button className="btn-icon" onClick={() => router.push({ name: 'create-service' })}>+</button>
              </>} />
      <div className="toolbar">
        {TYPES.map(t => (
          <button key={t.id} className={`chip ${filter === t.id ? 'active' : ''}`} onClick={() => setFilter(t.id as any)}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: 8 }}>
        <input placeholder="Filtrar por nombre…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {!loading && filtered.length === 0 && <div className="empty"><div className="ico">📭</div><div className="title">Sin servicios</div></div>}
          {filtered.map(s => {
            const ld = lastDeploys[s.id];
            const status = suspendedDot(s.suspended, ld?.status);
            return (
              <div key={s.id} className="card-row" onClick={() => router.push({ name: 'service', id: s.id })}>
                <span className={`dot ${status}`} />
                <div style={{ fontSize: 18 }}>{serviceTypeIcon(s.type)}</div>
                <div className="body">
                  <div className="title truncate">{s.name}</div>
                  <div className="sub truncate">
                    {serviceTypeLabel(s.type)}
                    {s.repo && ` · ${s.repo.replace('https://github.com/', '')}`}
                    {s.branch && ` (${s.branch})`}
                  </div>
                  <div className="sub small">{ld ? `${ld.status} · ${timeAgo(ld.finishedAt || ld.updatedAt)}` : 'sin deploys'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
