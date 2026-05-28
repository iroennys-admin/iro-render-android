import React, { useEffect, useState } from 'react';
import TopBar from '../ui/TopBar';
import { services, deploys, cron as renderCron, type Service, type Deploy } from '../api/render';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';
import { serviceTypeIcon, serviceTypeLabel, suspendedDot, timeAgo, deployStatusInfo } from '../ui/helpers';

export default function ServicePage({ id }: { id: string }) {
  const router = useRouter();
  const [svc, setSvc] = useState<Service | null>(null);
  const [last, setLast] = useState<Deploy[]>([]);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);

  const load = async () => {
    try {
      const [s, d] = await Promise.all([services.get(id), deploys.list(id, { limit: 5 })]);
      setSvc(s); setLast(d);
    } catch (e: any) { toast.error(e?.message); }
  };
  useEffect(() => { load(); }, [id]);

  const action = async (label: string, fn: () => Promise<any>, refresh = true) => {
    setBusy(true);
    try { await fn(); toast.success(label); if (refresh) await load(); }
    catch (e: any) {
      const m = e?.body?.message || e?.body?.error || e?.message || 'Error';
      toast.error(m);
      console.error('Action error', e);
    }
    finally { setBusy(false); setSheet(false); }
  };

  const triggerDeploy = (clearCache = false) =>
    action(clearCache ? 'Deploy lanzado (cache limpia)' : 'Deploy lanzado', () => deploys.trigger(id, { clearCache }));

  if (!svc) return (<><TopBar title="Servicio" /><div className="loading"><span className="spinner" /> Cargando…</div></>);

  const ld = last[0];
  const status = suspendedDot(svc.suspended, ld?.status);
  const url = svc.serviceDetails?.url;

  return (
    <>
      <TopBar title={svc.name} sub={serviceTypeLabel(svc.type)}
              actions={<button className="btn-icon" onClick={() => setSheet(true)}>⋮</button>} />
      <div className="scroll-area scroll">
        <div className="card" style={{ margin: 12 }}>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <span className={`dot ${status}`} />
            <div style={{ fontSize: 22 }}>{serviceTypeIcon(svc.type)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong">{svc.name}</div>
              <div className="muted small">{serviceTypeLabel(svc.type)} · auto-deploy: {svc.autoDeploy}</div>
            </div>
          </div>
          {url && (
            <div className="flex gap-2 mt-2">
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ flex: 1 }}>🌐 {url.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <span className="badge">{svc.repo ? '📂 Git' : svc.imagePath ? '🐳 Image' : ''}</span>
            {svc.branch && <span className="badge">{svc.branch}</span>}
            {svc.rootDir && <span className="badge">root: {svc.rootDir}</span>}
            <span className={`badge ${svc.suspended === 'suspended' ? 'warn' : 'success'}`}>
              {svc.suspended === 'suspended' ? 'suspendido' : 'activo'}
            </span>
          </div>

          {/* Primary actions */}
          <div className="flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => triggerDeploy(false)} disabled={busy}>🚀 Deploy</button>
            <button className="btn" onClick={() => triggerDeploy(true)} disabled={busy}>🧹 Deploy (clear cache)</button>
            <button className="btn" onClick={() => action('Servicio reiniciado', () => services.restart(id))} disabled={busy}>↻ Restart</button>
            {svc.type === 'cron_job' && (
              <button className="btn btn-accent" onClick={() => action('Cron lanzado', async () => {
                try { await renderCron.trigger(id); } catch (e) { throw e; }
              })} disabled={busy}>⏰ Run cron</button>
            )}
          </div>
        </div>

        {/* Sub-pages */}
        <div className="section-title">Recursos</div>
        <div className="list">
          <Row emoji="🚀" label="Deploys" sub={`${last.length} recientes`} onClick={() => router.push({ name: 'deploys', serviceId: id })} />
          <Row emoji="📜" label="Logs en vivo"   onClick={() => router.push({ name: 'logs', resource: id, resourceName: svc.name })} />
          <Row emoji="📊" label="Métricas"       onClick={() => router.push({ name: 'metrics', resource: id, resourceName: svc.name })} />
          <Row emoji="🔑" label="Env vars"       onClick={() => router.push({ name: 'env-vars', serviceId: id })} />
          <Row emoji="📄" label="Secret files"   onClick={() => router.push({ name: 'secret-files', serviceId: id })} />
          <Row emoji="🌍" label="Custom domains" onClick={() => router.push({ name: 'domains', serviceId: id })} />
          <Row emoji="📅" label="Eventos"        onClick={() => router.push({ name: 'events', serviceId: id })} />
          {(svc.type === 'web_service' || svc.type === 'private_service' || svc.type === 'background_worker') && (
            <>
              <Row emoji="🖥️" label="Instancias" onClick={() => router.push({ name: 'instances', serviceId: id })} />
              <Row emoji="🛠️" label="One-off jobs" onClick={() => router.push({ name: 'jobs', serviceId: id })} />
            </>
          )}
        </div>

        {/* Last deploys preview */}
        <div className="section-title">Últimos deploys</div>
        <div className="list">
          {last.map(d => {
            const info = deployStatusInfo(d.status);
            return (
              <div key={d.id} className="card-row" onClick={() => router.push({ name: 'deploy', serviceId: id, deployId: d.id })}>
                <span className={`badge ${info.color === 'success' ? 'success' : info.color === 'danger' ? 'danger' : info.color === 'warn' ? 'warn' : 'info'}`}>{info.label}</span>
                <div className="body">
                  <div className="title truncate">{d.commit?.message?.split('\n')[0] || d.image?.ref || d.id.slice(0, 12)}</div>
                  <div className="sub truncate">
                    {d.commit?.id ? `${d.commit.id.slice(0, 7)} · ` : ''}
                    {timeAgo(d.finishedAt || d.updatedAt || d.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>

      {/* Action sheet */}
      {sheet && (
        <div className="modal-bg" onClick={() => setSheet(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{svc.name}</h3>
            <div className="flex flex-col gap-2 mt-2">
              <button className="btn" onClick={() => action('Cache purged', () => services.purgeCache(id))} disabled={busy}>🧽 Purgar cache</button>
              {svc.suspended === 'suspended'
                ? <button className="btn btn-primary" onClick={() => action('Resumed', () => services.resume(id))} disabled={busy}>▶ Reanudar</button>
                : <button className="btn btn-warn"    onClick={() => action('Suspended', () => services.suspend(id))} disabled={busy}>⏸ Suspender</button>}
              <a className="btn btn-ghost center" href={svc.dashboardUrl} target="_blank" rel="noreferrer">🔗 Abrir en Render Dashboard</a>
              <button className="btn btn-danger" onClick={() => {
                if (!confirm(`¿BORRAR el servicio "${svc.name}"?\nEsta acción es IRREVERSIBLE.`)) return;
                if (prompt(`Escribe "${svc.name}" para confirmar:`) !== svc.name) return;
                action('Servicio borrado', () => services.delete(id), false).then(() => router.back());
              }} disabled={busy}>🗑 Borrar servicio</button>
              <button className="btn" onClick={() => setSheet(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ emoji, label, sub, onClick }: { emoji: string; label: string; sub?: string; onClick: () => void }) {
  return (
    <div className="card-row" onClick={onClick}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div className="body"><div className="title">{label}</div>{sub && <div className="sub">{sub}</div>}</div>
      <span className="muted">›</span>
    </div>
  );
}
