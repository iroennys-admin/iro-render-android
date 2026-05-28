import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { deploys, type Deploy } from '../api/render';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';
import { deployStatusInfo, timeAgo } from '../ui/helpers';

export default function DeploysPage({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Deploy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await deploys.list(serviceId, { limit: 50 })); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const trigger = async (clearCache = false) => {
    setBusy(true);
    try { await deploys.trigger(serviceId, { clearCache }); toast.success('Deploy lanzado'); await load(); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Deploys" actions={<button className="btn-icon" onClick={load}>↻</button>} />
      <div className="toolbar">
        <button className="chip active" onClick={() => trigger(false)} disabled={busy}>🚀 Nuevo deploy</button>
        <button className="chip" onClick={() => trigger(true)} disabled={busy}>🧹 Clear cache</button>
      </div>
      <div className="scroll-area scroll">
        <div className="list">
          {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
          {items.map(d => {
            const info = deployStatusInfo(d.status);
            return (
              <div key={d.id} className="card-row" onClick={() => router.push({ name: 'deploy', serviceId, deployId: d.id })}>
                <span className={`badge ${info.color === 'success' ? 'success' : info.color === 'danger' ? 'danger' : info.color === 'warn' ? 'warn' : 'info'}`}>{info.label}</span>
                <div className="body">
                  <div className="title truncate">{d.commit?.message?.split('\n')[0] || d.image?.ref || d.id.slice(0, 12)}</div>
                  <div className="sub truncate">
                    {d.commit?.id ? `${d.commit.id.slice(0, 7)} · ` : ''}
                    {d.trigger?.user?.email ? `by ${d.trigger.user.email} · ` : ''}
                    {timeAgo(d.finishedAt || d.updatedAt || d.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
