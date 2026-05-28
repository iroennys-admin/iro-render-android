export function timeAgo(date: string | number | undefined): string {
  if (!date) return '';
  const d = new Date(date).getTime();
  if (isNaN(d)) return '';
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`;
  if (s < 31536000) return `${Math.floor(s/2592000)}mo ago`;
  return `${Math.floor(s/31536000)}y ago`;
}

export function serviceTypeLabel(t: string): string {
  return ({
    web_service: 'Web', static_site: 'Static', private_service: 'Private',
    background_worker: 'Worker', cron_job: 'Cron', workflow: 'Workflow',
  } as Record<string, string>)[t] || t;
}

export function serviceTypeIcon(t: string): string {
  return ({
    web_service: '🌐', static_site: '📄', private_service: '🔒',
    background_worker: '⚙️', cron_job: '⏰', workflow: '🔁',
  } as Record<string, string>)[t] || '📦';
}

export function deployStatusInfo(s: string): { label: string; color: 'success'|'warn'|'danger'|'info' } {
  const map: Record<string, { label: string; color: any }> = {
    live: { label: 'live', color: 'success' },
    build_in_progress: { label: 'building', color: 'warn' },
    update_in_progress: { label: 'updating', color: 'warn' },
    pre_deploy_in_progress: { label: 'pre-deploy', color: 'warn' },
    deactivated: { label: 'deactivated', color: 'info' },
    canceled: { label: 'canceled', color: 'info' },
    build_failed: { label: 'build failed', color: 'danger' },
    update_failed: { label: 'failed', color: 'danger' },
    pre_deploy_failed: { label: 'pre-deploy failed', color: 'danger' },
    created: { label: 'created', color: 'info' },
  };
  return map[s] || { label: s, color: 'info' };
}

export function suspendedDot(s: string, lastDeployStatus?: string): 'live'|'building'|'failed'|'suspended'|'unknown' {
  if (s === 'suspended') return 'suspended';
  if (lastDeployStatus === 'live') return 'live';
  if (lastDeployStatus?.includes('in_progress')) return 'building';
  if (lastDeployStatus?.includes('failed')) return 'failed';
  return 'unknown';
}
