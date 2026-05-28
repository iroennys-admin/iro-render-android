import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { metrics } from '../api/render';
import { toast } from '../ui/Toast';

export default function MetricsPage({ resource, resourceName }: { resource: string; resourceName?: string }) {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      const opts = { startTime, endTime, step: 60 };
      const r = await Promise.allSettled([
        metrics.cpu(resource, opts),
        metrics.memory(resource, opts),
        metrics.instanceCount(resource, opts),
        metrics.httpRequests(resource, opts),
        metrics.httpLatency(resource, opts),
        metrics.bandwidth(resource, opts),
      ]);
      setData({
        cpu:       r[0].status === 'fulfilled' ? r[0].value : null,
        memory:    r[1].status === 'fulfilled' ? r[1].value : null,
        instances: r[2].status === 'fulfilled' ? r[2].value : null,
        http:      r[3].status === 'fulfilled' ? r[3].value : null,
        latency:   r[4].status === 'fulfilled' ? r[4].value : null,
        bandwidth: r[5].status === 'fulfilled' ? r[5].value : null,
      });
    } catch (e: any) { toast.error(e?.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [resource]);

  const last = (m: any) => {
    if (!m) return '—';
    const arr = m?.[0]?.values || m?.values || [];
    if (!arr.length) return '—';
    return arr[arr.length - 1]?.value;
  };

  return (
    <>
      <TopBar title="Métricas (1h)" sub={resourceName || resource} actions={<button className="btn-icon" onClick={load}>↻</button>} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        {loading && <div className="loading"><span className="spinner" /> Cargando…</div>}
        {!loading && (
          <>
            <Card label="CPU"            value={fmtPct(last(data.cpu))} />
            <Card label="Memoria"        value={fmtBytes(last(data.memory))} />
            <Card label="Instancias"     value={String(last(data.instances) ?? '—')} />
            <Card label="HTTP requests"  value={String(last(data.http) ?? '—')} />
            <Card label="HTTP latency"   value={(last(data.latency) ?? 0) + ' ms'} />
            <Card label="Bandwidth"      value={fmtBytes(last(data.bandwidth))} />
            <div className="muted tiny center mt-3">Render guarda métricas más detalladas en su dashboard.</div>
          </>
        )}
      </div>
    </>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="muted small">{label}</div>
      <div className="strong" style={{ fontSize: 24, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function fmtPct(v: any): string {
  if (v == null) return '—';
  const n = Number(v);
  return n.toFixed(1) + '%';
}
function fmtBytes(v: any): string {
  if (v == null) return '—';
  const n = Number(v);
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
  return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
