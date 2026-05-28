import React, { useEffect, useRef, useState } from 'react';
import TopBar from '../ui/TopBar';
import { logs as logsApi } from '../api/render';
import { useApp } from '../state/store';
import { toast } from '../ui/Toast';

const TYPES = [
  { id: '',        label: 'Todo' },
  { id: 'app',     label: 'App' },
  { id: 'request', label: 'Request' },
  { id: 'build',   label: 'Build' },
];

export default function LogsPage({ resource, resourceName }: { resource: string; resourceName?: string }) {
  const app = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState<string>('');
  const outRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<string | null>(null);

  const fetchNew = async () => {
    if (!app.ownerId) { toast.error('Falta workspace activo'); return; }
    setLoading(true);
    try {
      const opts: any = {
        ownerId: app.ownerId,
        resource,
        limit: 100,
        direction: 'backward',
      };
      if (type) opts.type = type;
      const r: any = await logsApi.list(opts);
      const arr: any[] = (r?.logs || []).slice();
      arr.reverse(); // oldest first
      setItems(arr);
      lastTimeRef.current = r?.nextEndTime || null;
    } catch (e: any) {
      const msg = e?.body?.message || e?.message || 'Error';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchNew(); /* eslint-disable-next-line */ }, [resource, type]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(fetchNew, 5000);
    return () => clearInterval(t);
  // eslint-disable-next-line
  }, [auto, resource, type, app.ownerId]);

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
        {TYPES.map(t => (
          <button key={t.id} className={`chip ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="toolbar">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar texto…" style={{ flex: 1 }} />
      </div>
      <div className="logs" ref={outRef}>
        {loading && items.length === 0 && <div className="loading"><span className="spinner" /> Cargando logs…</div>}
        {!loading && visible.length === 0 && (
          <div className="empty">
            <div className="ico">📜</div>
            <div className="title">Sin logs en este rango</div>
            <div className="muted small">Mostramos la última hora. {type ? `(tipo: ${type})` : ''}</div>
          </div>
        )}
        {visible.map((l, i) => {
          const msg = l.message || '';
          const labelType = (l.labels || []).find((x: any) => x.name === 'type')?.value || '';
          const labelLevel = (l.labels || []).find((x: any) => x.name === 'level')?.value || '';
          const kind = labelLevel === 'error' || /error|exception|fatal/i.test(msg)
                       ? 'error'
                       : labelLevel === 'warning' || /warn/i.test(msg) ? 'warn' : '';
          const ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '';
          return (
            <div key={l.id || i} className={`log-line ${kind}`}>
              <span className="ts">{ts}</span>
              <span className="msg">
                {labelType && labelType !== 'app' && <span className="badge" style={{ marginRight: 6 }}>{labelType}</span>}
                {msg}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
