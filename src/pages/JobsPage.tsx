import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { jobs, type Job } from '../api/render';
import { toast } from '../ui/Toast';
import { timeAgo } from '../ui/helpers';

export default function JobsPage({ serviceId }: { serviceId: string }) {
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await jobs.list(serviceId)); }
    catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [serviceId]);

  const run = async () => {
    if (!cmd.trim()) return;
    setBusy(true);
    try { await jobs.create(serviceId, { startCommand: cmd.trim() }); toast.success('Job lanzado'); setCmd(''); await load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="One-off jobs" sub={`${items.length}`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">Lanzar comando</div>
          <input placeholder="rails db:migrate" value={cmd} onChange={e => setCmd(e.target.value)} className="mt-2 mono" autoCorrect="off" autoCapitalize="off" />
          <button className="btn btn-primary mt-2" onClick={run} disabled={busy || !cmd.trim()}>▶ Run</button>
        </div>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {items.map(j => (
          <div key={j.id} className="card">
            <div className="row-between">
              <div className="mono small truncate">{j.startCommand}</div>
              <span className={`badge ${j.status === 'succeeded' ? 'success' : j.status === 'failed' ? 'danger' : 'info'}`}>{j.status}</span>
            </div>
            <div className="muted tiny mt-1">{timeAgo(j.createdAt)}</div>
            {(j.status === 'running' || j.status === 'pending') && (
              <button className="btn btn-sm btn-danger mt-2" onClick={async () => {
                try { await jobs.cancel(serviceId, j.id); toast.success('Cancelado'); load(); }
                catch (e: any) { toast.error(e?.message); }
              }}>🚫 Cancelar</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
