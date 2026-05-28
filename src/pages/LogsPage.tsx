import React, { useEffect, useRef, useState } from 'react';
import TopBar from '../ui/TopBar';
import { logs as logsApi } from '../api/render';
import { toast } from '../ui/Toast';

export default function LogsPage({ resource, resourceName }: { resource: string; resourceName?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState('');
  const outRef = useRef<HTMLDivElement>(null);

  const fetchNew = async () => {
    setLoading(true);
    try {
      const r = await logsApi.list({ resource, limit: 200, direction: 'backward' });
      const arr = (r as any).logs || [];
      arr.reverse();
      setItems(arr);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchNew(); }, [resource]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(fetchNew, 5000);
    return () => clearInterval(t);
  }, [auto, resource]);

  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight }); }, [items]);

  const visible = filter
    ? items.filter(l => (l.message || '').toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <>
      <TopBar title="Logs" sub={resourceName || resource} actions={
        <>
          <button className="btn-icon" onClick={fetchNew}>↻</button>
          <button className="btn-icon" onClick={() => setAuto(a => !a)} title={auto ? 'auto on' : 'auto off'}>
            {auto ? '🟢' : '⚪'}
          </button>
        </>
      } />
      <div className="toolbar">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar logs…" style={{ flex: 1 }} />
      </div>
      <div className="logs" ref={outRef}>
        {loading && items.length === 0 && <div className="loading"><span className="spinner" /> Cargando logs…</div>}
        {!loading && visible.length === 0 && <div className="empty"><div className="ico">📜</div><div className="title">Sin logs aún</div></div>}
        {visible.map((l, i) => {
          const msg = l.message || '';
          const kind = /error|exception|fatal/i.test(msg) ? 'error' : /warn/i.test(msg) ? 'warn' : 'normal';
          const ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '';
          return (
            <div key={i} className={`log-line ${kind === 'error' ? 'error' : kind === 'warn' ? 'warn' : ''}`}>
              <span className="ts">{ts}</span>
              <span className="msg">{msg}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
