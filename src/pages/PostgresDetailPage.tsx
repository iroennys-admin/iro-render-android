import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { postgres, type Postgres } from '../api/render';
import { toast } from '../ui/Toast';

export default function PostgresDetailPage({ id }: { id: string }) {
  const [p, setP] = useState<Postgres | null>(null);
  const [conn, setConn] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => postgres.get(id).then(setP).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, [id]);

  const fetchConn = async () => {
    try { setConn(await postgres.connection(id)); }
    catch (e: any) { toast.error(e?.message); }
  };
  const action = async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    try { await fn(); toast.success(label); load(); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };
  const copy = (s: string) => navigator.clipboard?.writeText(s).then(() => toast.success('Copiado'));

  if (!p) return (<><TopBar title="Postgres" /><div className="loading"><span className="spinner" /> Cargando…</div></>);
  return (
    <>
      <TopBar title={p.name} sub={`${p.plan} · v${p.version}`} />
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        <div className="card">
          <div className="strong">{p.name}</div>
          <div className="muted small">{p.status} · {p.region}</div>
          {p.databaseName && <div className="muted small mt-1">DB: <span className="mono">{p.databaseName}</span></div>}
          {p.databaseUser && <div className="muted small">User: <span className="mono">{p.databaseUser}</span></div>}
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn" onClick={fetchConn}>🔌 Connection info</button>
            <button className="btn" onClick={() => action('Restarted', () => postgres.restart(id))} disabled={busy}>↻ Restart</button>
            {p.status === 'suspended'
              ? <button className="btn btn-primary" onClick={() => action('Resumed', () => postgres.resume(id))} disabled={busy}>▶ Resume</button>
              : <button className="btn btn-warn" onClick={() => action('Suspended', () => postgres.suspend(id))} disabled={busy}>⏸ Suspend</button>}
            <button className="btn btn-danger" onClick={() => {
              if (!confirm(`¿BORRAR Postgres "${p.name}"? Esta acción es IRREVERSIBLE.`)) return;
              if (prompt(`Escribe "${p.name}" para confirmar:`) !== p.name) return;
              action('Borrado', () => postgres.delete(id));
            }} disabled={busy}>🗑 Borrar</button>
          </div>
        </div>
        {conn && (
          <div className="card">
            <div className="strong">Conexión</div>
            {conn.psqlCommand && <ConnRow label="psql" value={conn.psqlCommand} onCopy={() => copy(conn.psqlCommand)} />}
            {conn.externalConnectionString && <ConnRow label="External URL" value={conn.externalConnectionString} onCopy={() => copy(conn.externalConnectionString)} />}
            {conn.internalConnectionString && <ConnRow label="Internal URL" value={conn.internalConnectionString} onCopy={() => copy(conn.internalConnectionString)} />}
          </div>
        )}
      </div>
    </>
  );
}

function ConnRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="mt-2">
      <div className="muted small">{label}</div>
      <div className="flex gap-2 mt-1">
        <input value={value} readOnly className="mono small" style={{ filter: 'blur(3px)' }} onFocus={e => e.target.style.filter = 'none'} onBlur={e => e.target.style.filter = 'blur(3px)'} />
        <button className="btn btn-sm" onClick={onCopy}>📋</button>
      </div>
    </div>
  );
}
