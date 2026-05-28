import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { deploys, type Deploy } from '../api/render';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';
import { deployStatusInfo, timeAgo } from '../ui/helpers';

export default function DeployDetailPage({ serviceId, deployId }: { serviceId: string; deployId: string }) {
  const router = useRouter();
  const [d, setD] = useState<Deploy | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => deploys.get(serviceId, deployId).then(setD).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [serviceId, deployId]);

  const cancel = async () => {
    if (!confirm('¿Cancelar este deploy?')) return;
    setBusy(true);
    try { await deploys.cancel(serviceId, deployId); toast.success('Cancelado'); load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const rollback = async () => {
    if (!confirm('¿Hacer rollback a este deploy?')) return;
    setBusy(true);
    try { await deploys.rollback(serviceId, deployId); toast.success('Rollback lanzado'); router.back(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  if (!d) return (<><TopBar title="Deploy" /><div className="loading"><span className="spinner" /> Cargando…</div></>);
  const info = deployStatusInfo(d.status);

  return (
    <>
      <TopBar title={`Deploy ${d.id.slice(0, 12)}`} actions={<button className="btn-icon" onClick={load}>↻</button>} />
      <div className="scroll-area scroll">
        <div className="card" style={{ margin: 12 }}>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <span className={`badge ${info.color === 'success' ? 'success' : info.color === 'danger' ? 'danger' : info.color === 'warn' ? 'warn' : 'info'}`}>{info.label}</span>
            <span className="muted small">{timeAgo(d.finishedAt || d.updatedAt || d.createdAt)}</span>
          </div>
          {d.commit && (
            <>
              <div className="strong mt-2">{d.commit.message.split('\n')[0]}</div>
              <div className="mono small muted">{d.commit.id}</div>
            </>
          )}
          {d.image && <div className="mono small muted mt-2">image: {d.image.ref}</div>}
          {d.trigger?.user && <div className="muted small mt-2">by {d.trigger.user.email}</div>}
          <div className="muted small mt-1">
            created: {new Date(d.createdAt).toLocaleString()}<br/>
            updated: {new Date(d.updatedAt).toLocaleString()}<br/>
            {d.finishedAt && <>finished: {new Date(d.finishedAt).toLocaleString()}</>}
          </div>

          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push({ name: 'logs', resource: serviceId })}>📜 Ver logs</button>
            {d.status.includes('in_progress') && (
              <button className="btn btn-danger" onClick={cancel} disabled={busy}>🚫 Cancelar</button>
            )}
            {(d.status === 'live' || d.status === 'deactivated') && (
              <button className="btn" onClick={rollback} disabled={busy}>↩ Rollback aquí</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
