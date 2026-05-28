import React from 'react';
import TopBar from '../ui/TopBar';

export default function AboutPage() {
  return (
    <>
      <TopBar title="Acerca de" />
      <div className="scroll-area scroll" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 80 }}>📡</div>
        <h2 className="strong" style={{ margin: '6px 0' }}>IroRender</h2>
        <div className="muted small">v1.0.0 · React + Capacitor</div>
        <div className="card mt-4" style={{ textAlign: 'left' }}>
          <p>Cobertura completa de la API de Render:</p>
          <ul>
            <li>Servicios (web, static, worker, cron, private)</li>
            <li>Deploys, rollback, restart, suspend, scale, jobs</li>
            <li>Logs en vivo, eventos, métricas, instancias</li>
            <li>Env vars, secret files, custom domains, headers</li>
            <li>Postgres, Key-Value (Redis), Disks, Snapshots</li>
            <li>Projects, Environments, Env Groups, Blueprints, Registry</li>
          </ul>
          <p className="muted small mt-2">🔔 Sistema anti-sleep: tu app crea/actualiza un workflow YAML en un repo privado tuyo de GitHub. GitHub Actions hace ping cada N minutos 24/7 gratis — sin depender de tu móvil.</p>
        </div>
      </div>
    </>
  );
}
