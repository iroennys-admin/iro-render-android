import React, { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { useRouter } from '../state/router';
import { services, deploys, type Service, type Deploy } from '../api/render';
import { toast } from '../ui/Toast';
import TopBar from '../ui/TopBar';
import { serviceTypeIcon, serviceTypeLabel, suspendedDot, timeAgo } from '../ui/helpers';

export default function HomePage() {
  const app = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Service[]>([]);
  const [lastDeploys, setLastDeploys] = useState<Record<string, Deploy | null>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await services.list(app.ownerId ? { ownerId: app.ownerId, limit: 100 } : { limit: 100 });
      setItems(all);
      // Fetch last deploys in parallel (just first 8 for quick overview)
      const subset = all.slice(0, 8);
      const last = await Promise.allSettled(subset.map(s => deploys.list(s.id, { limit: 1 })));
      const map: Record<string, Deploy | null> = {};
      subset.forEach((s, i) => {
        const r = last[i];
        map[s.id] = r.status === 'fulfilled' ? (r.value[0] || null) : null;
      });
      setLastDeploys(map);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [app.ownerId]);

  const active = app.owners.find(o => o.id === app.ownerId);
  const counts = items.reduce((a, s) => { a[s.type] = (a[s.type] || 0) + 1; return a; }, {} as Record<string, number>);
  const suspended = items.filter(s => s.suspended === 'suspended').length;

  return (
    <>
      <TopBar title={`Hola${active ? ', ' + active.name : ''} 👋`}
              sub={`${items.length} servicios${suspended ? ` · ${suspended} suspendidos` : ''}`}
              showBack={false}
              actions={<button className="btn-icon" onClick={load}>↻</button>} />

      <div className="scroll-area scroll">
        {/* Workspace selector */}
        {app.owners.length > 1 && (
          <div className="card" style={{ margin: 12 }}>
            <div className="muted small">Workspace activo</div>
            <select value={app.ownerId || ''} onChange={e => app.setOwnerId(e.target.value)} className="mt-2">
              {app.owners.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
            </select>
          </div>
        )}

        {/* Quick stats */}
        <div className="section-title">Resumen</div>
        <div className="flex gap-2" style={{ padding: '0 12px', flexWrap: 'wrap' }}>
          {Object.entries(counts).map(([t, n]) => (
            <div key={t} className="card" style={{ flex: '1 1 30%', minWidth: 100, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{serviceTypeIcon(t)}</div>
              <div className="strong">{n}</div>
              <div className="muted tiny">{serviceTypeLabel(t)}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="section-title">Acceso rápido</div>
        <div className="list flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Quick emoji="➕" label="Nuevo deploy"   onClick={() => router.push({ name: 'create-service' })} />
          <Quick emoji="📦" label="Servicios"     onClick={() => router.push({ name: 'services' })} />
          <Quick emoji="🔔" label="Pings"         onClick={() => router.push({ name: 'pings' })} />
          <Quick emoji="🐘" label="Postgres"      onClick={() => router.push({ name: 'postgres-list' })} />
          <Quick emoji="🔑" label="Key-Value"     onClick={() => router.push({ name: 'kv-list' })} />
          <Quick emoji="💿" label="Disks"         onClick={() => router.push({ name: 'disks' })} />
          <Quick emoji="📚" label="Env Groups"    onClick={() => router.push({ name: 'env-groups' })} />
          <Quick emoji="📋" label="Blueprints"    onClick={() => router.push({ name: 'blueprints' })} />
          <Quick emoji="🗂️" label="Projects"      onClick={() => router.push({ name: 'projects' })} />
          <Quick emoji="🔐" label="Registry"      onClick={() => router.push({ name: 'registry' })} />
        </div>

        {/* Recent services */}
        <div className="section-title">Servicios recientes</div>
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {!loading && items.length === 0 && (
            <div className="empty">
              <div className="ico">📦</div><div className="title">Aún no tienes servicios</div>
              <button className="btn btn-primary mt-2" onClick={() => router.push({ name: 'create-service' })}>➕ Crear primer servicio</button>
            </div>
          )}
          {items.slice(0, 8).map(s => {
            const ld = lastDeploys[s.id];
            const status = suspendedDot(s.suspended, ld?.status);
            return (
              <div key={s.id} className="card-row" onClick={() => router.push({ name: 'service', id: s.id })}>
                <span className={`dot ${status}`} />
                <div style={{ fontSize: 18 }}>{serviceTypeIcon(s.type)}</div>
                <div className="body">
                  <div className="title truncate">{s.name}</div>
                  <div className="sub truncate">
                    {serviceTypeLabel(s.type)} · {ld ? ld.status : 'sin deploys'}
                    {ld?.finishedAt && ` · ${timeAgo(ld.finishedAt)}`}
                  </div>
                </div>
              </div>
            );
          })}
          {items.length > 8 && (
            <button className="btn btn-ghost mt-2" style={{ width: '100%' }} onClick={() => router.push({ name: 'services' })}>
              Ver todos ({items.length})
            </button>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </>
  );
}

function Quick({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card" style={{ flex: '1 1 30%', minWidth: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 6px', cursor: 'pointer' }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span className="small strong">{label}</span>
    </button>
  );
}
