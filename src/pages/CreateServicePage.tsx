import React, { useState, useEffect } from 'react';
import TopBar from '../ui/TopBar';
import { services, blueprints, owners as ownersApi } from '../api/render';
import { useApp } from '../state/store';
import { useRouter } from '../state/router';
import { toast } from '../ui/Toast';

const REGIONS = ['oregon','frankfurt','ohio','singapore','virginia'];
const FREE_PLAN = 'free';
const WEB_PLANS = ['free','starter','standard','pro','pro_plus','pro_max'];

export default function CreateServicePage() {
  const router = useRouter();
  const app = useApp();
  const [tab, setTab] = useState<'guided'|'blueprint'>('guided');
  const [busy, setBusy] = useState(false);

  // Guided form
  const [type, setType] = useState<'web_service'|'static_site'|'background_worker'|'private_service'|'cron_job'>('web_service');
  const [name, setName] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootDir, setRootDir] = useState('');
  const [region, setRegion] = useState('oregon');
  const [plan, setPlan] = useState(FREE_PLAN);
  const [runtime, setRuntime] = useState<'node'|'python'|'docker'|'go'|'ruby'|'static'>('node');
  const [buildCmd, setBuildCmd] = useState('npm install');
  const [startCmd, setStartCmd] = useState('npm start');
  const [publishPath, setPublishPath] = useState('./dist');
  const [healthCheckPath, setHealthCheckPath] = useState('');
  const [schedule, setSchedule] = useState('0 0 * * *');

  // Blueprint form
  const [yaml, setYaml] = useState('');

  const createGuided = async () => {
    if (!name.trim() || !app.ownerId) return;
    if (type !== 'static_site' && !repo.trim()) { toast.error('Falta el repo'); return; }
    setBusy(true);
    try {
      const body: any = {
        type,
        name: name.trim(),
        ownerId: app.ownerId,
        repo: repo.trim() || undefined,
        branch: branch.trim() || undefined,
        rootDir: rootDir.trim() || undefined,
        autoDeploy: 'yes',
        serviceDetails: {
          region,
          plan: type === 'static_site' ? undefined : plan,
          env: runtime,
          buildCommand: type === 'static_site' || runtime !== 'docker' ? buildCmd : undefined,
          startCommand: type !== 'static_site' && runtime !== 'docker' ? startCmd : undefined,
          publishPath: type === 'static_site' ? publishPath : undefined,
          healthCheckPath: type === 'web_service' ? (healthCheckPath || undefined) : undefined,
          schedule: type === 'cron_job' ? schedule : undefined,
        },
      };
      const r = await services.create(body);
      toast.success('Servicio creado');
      router.replace({ name: 'service', id: r.service.id });
    } catch (e: any) {
      toast.error(e?.body?.message || e?.message || 'Error');
    } finally { setBusy(false); }
  };

  const validateYaml = async () => {
    setBusy(true);
    try { const r: any = await blueprints.validate(yaml); toast.success(`Plan válido: ${r?.plan?.length || 0} recursos`); }
    catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  };

  return (
    <>
      <TopBar title="Nuevo servicio" showBack={false} />
      <div className="tabs">
        <button className={`tab ${tab === 'guided' ? 'active' : ''}`} onClick={() => setTab('guided')}>Guiado</button>
        <button className={`tab ${tab === 'blueprint' ? 'active' : ''}`} onClick={() => setTab('blueprint')}>render.yaml</button>
      </div>
      <div className="scroll-area scroll" style={{ padding: 12 }}>
        {tab === 'guided' ? (
          <>
            <div className="field">
              <label>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="web_service">Web Service</option>
                <option value="static_site">Static Site</option>
                <option value="background_worker">Background Worker</option>
                <option value="private_service">Private Service</option>
                <option value="cron_job">Cron Job</option>
              </select>
            </div>
            <div className="field"><label>Nombre</label><input value={name} onChange={e => setName(e.target.value)} autoCorrect="off" autoCapitalize="off" /></div>
            <div className="field"><label>Repo (URL Git)</label><input placeholder="https://github.com/owner/repo" value={repo} onChange={e => setRepo(e.target.value)} autoCorrect="off" autoCapitalize="off" /></div>
            <div className="field"><label>Branch</label><input value={branch} onChange={e => setBranch(e.target.value)} autoCorrect="off" autoCapitalize="off" /></div>
            <div className="field"><label>Root dir (opcional)</label><input value={rootDir} onChange={e => setRootDir(e.target.value)} autoCorrect="off" autoCapitalize="off" /></div>
            <div className="field">
              <label>Región</label>
              <select value={region} onChange={e => setRegion(e.target.value)}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {type !== 'static_site' && (
              <div className="field">
                <label>Plan</label>
                <select value={plan} onChange={e => setPlan(e.target.value)}>
                  {WEB_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {type !== 'static_site' && (
              <div className="field">
                <label>Runtime</label>
                <select value={runtime} onChange={e => setRuntime(e.target.value as any)}>
                  <option value="node">Node</option>
                  <option value="python">Python</option>
                  <option value="docker">Docker</option>
                  <option value="go">Go</option>
                  <option value="ruby">Ruby</option>
                </select>
              </div>
            )}

            {runtime !== 'docker' && type !== 'cron_job' && (
              <>
                <div className="field"><label>Build command</label><input value={buildCmd} onChange={e => setBuildCmd(e.target.value)} className="mono" autoCorrect="off" autoCapitalize="off" /></div>
                {type !== 'static_site' && (
                  <div className="field"><label>Start command</label><input value={startCmd} onChange={e => setStartCmd(e.target.value)} className="mono" autoCorrect="off" autoCapitalize="off" /></div>
                )}
              </>
            )}

            {type === 'static_site' && (
              <div className="field"><label>Publish path</label><input value={publishPath} onChange={e => setPublishPath(e.target.value)} className="mono" autoCorrect="off" autoCapitalize="off" /></div>
            )}

            {type === 'web_service' && (
              <div className="field"><label>Health check path (opcional)</label><input value={healthCheckPath} onChange={e => setHealthCheckPath(e.target.value)} placeholder="/health" className="mono" autoCorrect="off" autoCapitalize="off" /></div>
            )}

            {type === 'cron_job' && (
              <div className="field"><label>Schedule (cron)</label><input value={schedule} onChange={e => setSchedule(e.target.value)} className="mono" autoCorrect="off" autoCapitalize="off" /></div>
            )}

            <button className="btn btn-primary mt-3" style={{ width: '100%' }} onClick={createGuided} disabled={busy || !name.trim()}>
              {busy ? <span className="spinner" /> : '🚀 Crear servicio'}
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label>render.yaml</label>
              <textarea rows={20} value={yaml} onChange={e => setYaml(e.target.value)} placeholder="services:\n  - type: web\n    name: my-app\n    ..." className="mono small" autoCorrect="off" autoCapitalize="off" />
            </div>
            <div className="flex gap-2">
              <button className="btn" onClick={validateYaml} disabled={busy || !yaml.trim()}>🔍 Validar</button>
              <div className="muted small" style={{ alignSelf: 'center' }}>Para crear recursos desde Blueprint, conecta el repo en el dashboard de Render.</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
