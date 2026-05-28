// ============================================================
// IroRender · Typed wrappers for Render REST API
// ============================================================

import { render, unwrap } from './client';

// ── Types ───────────────────────────────────────────────────
export type ServiceType =
  | 'web_service' | 'private_service' | 'background_worker'
  | 'cron_job' | 'static_site' | 'workflow';

export type Suspended = 'suspended' | 'not_suspended';

export interface Owner {
  id: string; name: string; email?: string; type: 'user' | 'team';
  twoFactorAuthEnabled?: boolean;
}

export interface Service {
  id: string; name: string; slug?: string;
  ownerId: string; type: ServiceType;
  repo?: string; branch?: string; rootDir?: string;
  imagePath?: string;
  environmentId?: string;
  autoDeploy: 'yes' | 'no';
  notifyOnFail?: string;
  suspended: Suspended;
  suspenders?: string[];
  createdAt: string; updatedAt: string;
  dashboardUrl: string;
  serviceDetails?: any; // shape depends on type (webServiceDetails, etc.)
}

export interface Deploy {
  id: string; commit?: { id: string; message: string; createdAt: string };
  image?: { ref: string; sha?: string };
  status: 'created' | 'build_in_progress' | 'update_in_progress' | 'live'
       | 'deactivated' | 'build_failed' | 'update_failed' | 'canceled' | 'pre_deploy_in_progress' | 'pre_deploy_failed';
  trigger: { newCommit?: any; manual?: boolean; user?: { id: string; email: string } };
  finishedAt?: string | null; createdAt: string; updatedAt: string;
}

export interface Job {
  id: string; serviceId: string; startCommand: string; planId?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'unknown';
  startedAt?: string | null; finishedAt?: string | null;
  createdAt: string;
}

export interface EnvVar { key: string; value: string; }
export interface SecretFile { name: string; content: string; }

export interface CustomDomain {
  id: string; name: string; domainType: 'apex' | 'subdomain';
  verificationStatus: 'verified' | 'unverified';
  redirectForName?: string;
  createdAt: string;
  publicSuffix?: string;
}

export interface Project { id: string; name: string; ownerId: string; createdAt: string; updatedAt: string; }
export interface Environment {
  id: string; name: string; projectId: string;
  protectedStatus?: string; networkIsolated?: boolean;
  createdAt: string; updatedAt: string;
}

export interface Postgres {
  id: string; name: string; ownerId: string; environmentId?: string;
  plan: string; version: string; region: string; readReplicas?: any[];
  status: 'creating' | 'available' | 'unavailable' | 'config_restart' | 'maintenance_in_progress' | 'maintenance_scheduled' | 'recovery_failed' | 'recovery_in_progress' | 'suspended' | 'unknown' | 'updating';
  databaseName?: string; databaseUser?: string;
  createdAt: string; updatedAt: string;
  dashboardUrl?: string;
}
export interface KeyValue { // formerly redis
  id: string; name: string; ownerId: string; environmentId?: string;
  plan: string; region: string;
  status: string; ipAllowList?: any[];
  createdAt: string; updatedAt: string; dashboardUrl?: string;
}
export interface EnvGroup {
  id: string; name: string; ownerId: string; environmentId?: string;
  envVars?: EnvVar[]; secretFiles?: SecretFile[];
  createdAt: string; updatedAt: string;
}
export interface Disk {
  id: string; name: string; sizeGB: number;
  mountPath: string; serviceId: string;
  createdAt: string; updatedAt: string;
}
export interface Blueprint {
  id: string; name: string; repo: string; branch: string;
  status: string; lastSync?: string; ownerId: string;
  createdAt: string; updatedAt: string; dashboardUrl?: string;
}
export interface RegistryCredential {
  id: string; name: string; registry: 'GITHUB'|'GITLAB'|'DOCKER'|'GOOGLE_ARTIFACT'|'AWS_ECR';
  username: string; updatedAt: string;
}
export interface ServiceEvent {
  id: string; type: string; details: any; timestamp: string;
}
export interface Instance {
  id: string; createdAt: string;
}
export interface LogEntry {
  id?: string;
  timestamp: string;
  message: string;
  labels?: { name: string; value: string }[];
}

// ════════════════════════════════════════════════════════════
// AUTH / OWNERS / USER
// ════════════════════════════════════════════════════════════
export const owners = {
  list: () => render.get<any[]>('/owners').then(unwrap<Owner>),
  get: (id: string) => render.get<Owner>(`/owners/${id}`),
};

// ════════════════════════════════════════════════════════════
// SERVICES
// ════════════════════════════════════════════════════════════
export const services = {
  list: (q: { ownerId?: string|string[]; name?: string; type?: ServiceType|ServiceType[]; env?: string;
              suspended?: Suspended|Suspended[]; createdAfter?: string; updatedAfter?: string;
              limit?: number; cursor?: string } = {}) =>
    render.get<any[]>('/services', { limit: 100, ...q }).then(unwrap<Service>),

  paginated: (ownerId?: string) =>
    render.paginate<Service>('/services', ownerId ? { ownerId } : {}, true, 5, 100),

  get: (id: string) => render.get<Service>(`/services/${id}`),

  create: (body: any) => render.post<{ service: Service; deployId?: string }>('/services', body),
  update: (id: string, body: any) => render.patch<Service>(`/services/${id}`, body),
  delete: (id: string) => render.delete(`/services/${id}`),

  suspend: (id: string) => render.post(`/services/${id}/suspend`),
  resume:  (id: string) => render.post(`/services/${id}/resume`),
  restart: (id: string) => render.post(`/services/${id}/restart`),
  scale: (id: string, numInstances: number) => render.post(`/services/${id}/scale`, { numInstances }),
  autoscale: (id: string, body: any) => render.put(`/services/${id}/autoscaling`, body),
  deleteAutoscale: (id: string) => render.delete(`/services/${id}/autoscaling`),
  purgeCache: (id: string) => render.post(`/services/${id}/purge-cache`),

  instances: (id: string) =>
    render.get<any[]>(`/services/${id}/instances`).then(unwrap<Instance>),
  restartInstance: (serviceId: string, instanceId: string) =>
    render.post(`/services/${serviceId}/instances/${instanceId}/restart`),

  events: (id: string, opts: { limit?: number; cursor?: string } = {}) =>
    render.get<any[]>(`/services/${id}/events`, { limit: 30, ...opts }).then(unwrap<ServiceEvent>),

  // env vars
  envVars: (id: string) =>
    render.get<any[]>(`/services/${id}/env-vars`).then(unwrap<EnvVar>),
  setEnvVars: (id: string, list: EnvVar[]) =>
    render.put<any[]>(`/services/${id}/env-vars`, list),
  setEnvVar: (id: string, key: string, value: string) =>
    render.put(`/services/${id}/env-vars/${encodeURIComponent(key)}`, { value }),
  deleteEnvVar: (id: string, key: string) =>
    render.delete(`/services/${id}/env-vars/${encodeURIComponent(key)}`),

  // secret files
  secretFiles: (id: string) =>
    render.get<any[]>(`/services/${id}/secret-files`).then(unwrap<SecretFile>),
  setSecretFiles: (id: string, list: SecretFile[]) =>
    render.put(`/services/${id}/secret-files`, list),
  setSecretFile: (id: string, name: string, content: string) =>
    render.put(`/services/${id}/secret-files/${encodeURIComponent(name)}`, { content }),
  deleteSecretFile: (id: string, name: string) =>
    render.delete(`/services/${id}/secret-files/${encodeURIComponent(name)}`),

  // custom domains
  domains: (id: string) =>
    render.get<any[]>(`/services/${id}/custom-domains`).then(unwrap<CustomDomain>),
  addDomain: (id: string, name: string, redirectForName?: string) =>
    render.post<CustomDomain>(`/services/${id}/custom-domains`, { name, redirectForName }),
  deleteDomain: (id: string, idOrName: string) =>
    render.delete(`/services/${id}/custom-domains/${encodeURIComponent(idOrName)}`),
  verifyDomain: (serviceId: string, domainId: string) =>
    render.post(`/services/${serviceId}/custom-domains/${domainId}/verify`),

  // headers
  headers: (id: string) => render.get(`/services/${id}/headers`),
  setHeaders: (id: string, list: any[]) => render.put(`/services/${id}/headers`, list),

  // notification settings (notify on fail)
  setNotifyOnFail: (id: string, mode: 'default'|'notify'|'ignore') =>
    services.update(id, { notifyOnFail: mode }),
};

// ════════════════════════════════════════════════════════════
// DEPLOYS
// ════════════════════════════════════════════════════════════
export const deploys = {
  list: (serviceId: string, opts: { limit?: number; cursor?: string; status?: string|string[] } = {}) =>
    render.get<any[]>(`/services/${serviceId}/deploys`, { limit: 30, ...opts }).then(unwrap<Deploy>),

  get: (serviceId: string, deployId: string) =>
    render.get<Deploy>(`/services/${serviceId}/deploys/${deployId}`),

  /** Trigger a new deploy. Optionally clear build cache. */
  trigger: (serviceId: string, opts: { clearCache?: boolean; commitId?: string; imageUrl?: string } = {}) => {
    const body: any = {};
    if (opts.clearCache) body.clearCache = 'clear';
    if (opts.commitId) body.commitId = opts.commitId;
    if (opts.imageUrl) body.imageUrl = opts.imageUrl;
    return render.post<Deploy>(`/services/${serviceId}/deploys`, body);
  },

  cancel: (serviceId: string, deployId: string) =>
    render.post(`/services/${serviceId}/deploys/${deployId}/cancel`),

  rollback: (serviceId: string, deployId: string) =>
    render.post<Deploy>(`/services/${serviceId}/rollback`, { deployId }),
};

// ════════════════════════════════════════════════════════════
// JOBS (one-off jobs)
// ════════════════════════════════════════════════════════════
export const jobs = {
  list: (serviceId: string) =>
    render.get<any[]>(`/services/${serviceId}/jobs`).then(unwrap<Job>),
  get: (serviceId: string, jobId: string) =>
    render.get<Job>(`/services/${serviceId}/jobs/${jobId}`),
  create: (serviceId: string, body: { startCommand: string; planId?: string }) =>
    render.post<Job>(`/services/${serviceId}/jobs`, body),
  cancel: (serviceId: string, jobId: string) =>
    render.post(`/services/${serviceId}/jobs/${jobId}/cancel`),
};

// ════════════════════════════════════════════════════════════
// CRON JOBS
// ════════════════════════════════════════════════════════════
export const cron = {
  trigger: (serviceId: string) => render.post(`/services/${serviceId}/run`),
  cancel:  (serviceId: string, runId: string) => render.post(`/services/${serviceId}/cron-runs/${runId}/cancel`),
};

// ════════════════════════════════════════════════════════════
// LOGS
// ════════════════════════════════════════════════════════════
export const logs = {
  /** Generic logs query. Resource = service id, postgres id, etc. */
  list: (opts: {
    resource?: string|string[]; ownerId?: string|string[];
    startTime?: string; endTime?: string;
    limit?: number;
    text?: string;
    level?: string|string[]; type?: string|string[];
    instance?: string|string[]; host?: string|string[];
    direction?: 'forward'|'backward';
  } = {}) => render.get<{ logs: LogEntry[]; hasMore?: boolean; nextStartTime?: string; nextEndTime?: string }>('/logs', { limit: 100, direction: 'backward', ...opts }),

  /** Log label values, e.g. unique instances, hosts, etc. */
  labels: (label: string, opts: { resource?: string|string[]; ownerId?: string|string[]; startTime?: string; endTime?: string; } = {}) =>
    render.get<{ values: string[] }>(`/logs/values/${label}`, opts),
};

// ════════════════════════════════════════════════════════════
// POSTGRES
// ════════════════════════════════════════════════════════════
export const postgres = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/postgres', { ownerId, limit: 100 }).then(unwrap<Postgres>),
  get: (id: string) => render.get<Postgres>(`/postgres/${id}`),
  create: (body: any) => render.post<Postgres>('/postgres', body),
  update: (id: string, body: any) => render.patch<Postgres>(`/postgres/${id}`, body),
  delete: (id: string) => render.delete(`/postgres/${id}`),
  suspend: (id: string) => render.post(`/postgres/${id}/suspend`),
  resume:  (id: string) => render.post(`/postgres/${id}/resume`),
  restart: (id: string) => render.post(`/postgres/${id}/restart`),
  failover:(id: string) => render.post(`/postgres/${id}/failover`),
  recover: (id: string, restoreTime: string) => render.post(`/postgres/${id}/recovery`, { restoreTime }),
  connection: (id: string) => render.get<{
    externalConnectionString?: string; internalConnectionString?: string;
    psqlCommand?: string; password?: string;
  }>(`/postgres/${id}/connection-info`),
  users: (id: string) => render.get<any[]>(`/postgres/${id}/users`),
  createUser: (id: string, body: { name: string }) =>
    render.post(`/postgres/${id}/users`, body),
  deleteUser: (id: string, userId: string) => render.delete(`/postgres/${id}/users/${userId}`),
  exports: (id: string) => render.get<any[]>(`/postgres/${id}/export`),
  createExport: (id: string) => render.post(`/postgres/${id}/export`),
  recoveryInfo: (id: string) => render.get(`/postgres/${id}/recovery`),
};

// ════════════════════════════════════════════════════════════
// KEY VALUE (replaces Redis)
// ════════════════════════════════════════════════════════════
export const keyValue = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/key-value', { ownerId, limit: 100 }).then(unwrap<KeyValue>),
  get: (id: string) => render.get<KeyValue>(`/key-value/${id}`),
  create: (body: any) => render.post<KeyValue>('/key-value', body),
  update: (id: string, body: any) => render.patch<KeyValue>(`/key-value/${id}`, body),
  delete: (id: string) => render.delete(`/key-value/${id}`),
  suspend: (id: string) => render.post(`/key-value/${id}/suspend`),
  resume:  (id: string) => render.post(`/key-value/${id}/resume`),
  connection: (id: string) => render.get(`/key-value/${id}/connection-info`),
};

// ════════════════════════════════════════════════════════════
// REDIS (deprecated, kept for compat)
// ════════════════════════════════════════════════════════════
export const redis = {
  list: () => render.get<any[]>('/redis').then(unwrap),
  get: (id: string) => render.get(`/redis/${id}`),
  update: (id: string, body: any) => render.patch(`/redis/${id}`, body),
  delete: (id: string) => render.delete(`/redis/${id}`),
  connection: (id: string) => render.get(`/redis/${id}/connection-info`),
};

// ════════════════════════════════════════════════════════════
// PROJECTS / ENVIRONMENTS
// ════════════════════════════════════════════════════════════
export const projects = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/projects', { ownerId, limit: 100 }).then(unwrap<Project>),
  get: (id: string) => render.get<Project>(`/projects/${id}`),
  create: (body: { name: string; ownerId: string; environments?: any[] }) => render.post<Project>('/projects', body),
  update: (id: string, body: any) => render.patch(`/projects/${id}`, body),
  delete: (id: string) => render.delete(`/projects/${id}`),
  environments: (projectId: string) =>
    render.get<any[]>(`/projects/${projectId}/environments`).then(unwrap<Environment>),
};
export const environments = {
  get: (id: string) => render.get<Environment>(`/environments/${id}`),
  create: (projectId: string, body: { name: string }) => render.post(`/projects/${projectId}/environments`, body),
  update: (id: string, body: any) => render.patch(`/environments/${id}`, body),
  delete: (id: string) => render.delete(`/environments/${id}`),
  addResources: (id: string, resourceIds: string[]) => render.post(`/environments/${id}/resources/add`, { resourceIds }),
  removeResources: (id: string, resourceIds: string[]) => render.post(`/environments/${id}/resources/remove`, { resourceIds }),
};

// ════════════════════════════════════════════════════════════
// BLUEPRINTS (render.yaml)
// ════════════════════════════════════════════════════════════
export const blueprints = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/blueprints', { ownerId, limit: 100 }).then(unwrap<Blueprint>),
  get: (id: string) => render.get<Blueprint>(`/blueprints/${id}`),
  update: (id: string, body: any) => render.patch(`/blueprints/${id}`, body),
  disconnect: (id: string) => render.post(`/blueprints/${id}/disconnect`),
  syncs: (id: string) => render.get(`/blueprints/${id}/syncs`),
  validate: async (yamlText: string) => {
    const fd = new FormData();
    fd.append('renderYaml', new Blob([yamlText], { type: 'text/yaml' }), 'render.yaml');
    return render.request('/blueprints/validate', { method: 'POST', body: fd });
  },
};

// ════════════════════════════════════════════════════════════
// ENVIRONMENT GROUPS
// ════════════════════════════════════════════════════════════
export const envGroups = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/env-groups', { ownerId, limit: 100 }).then(unwrap<EnvGroup>),
  get: (id: string) => render.get<EnvGroup>(`/env-groups/${id}`),
  create: (body: { name: string; ownerId: string; envVars?: EnvVar[]; secretFiles?: SecretFile[] }) =>
    render.post<EnvGroup>('/env-groups', body),
  update: (id: string, body: any) => render.patch(`/env-groups/${id}`, body),
  delete: (id: string) => render.delete(`/env-groups/${id}`),
  linkService:   (id: string, serviceId: string) => render.post(`/env-groups/${id}/services/${serviceId}`),
  unlinkService: (id: string, serviceId: string) => render.delete(`/env-groups/${id}/services/${serviceId}`),
  setEnvVar:    (id: string, key: string, value: string) =>
    render.put(`/env-groups/${id}/env-vars/${encodeURIComponent(key)}`, { value }),
  deleteEnvVar: (id: string, key: string) =>
    render.delete(`/env-groups/${id}/env-vars/${encodeURIComponent(key)}`),
  setSecretFile: (id: string, name: string, content: string) =>
    render.put(`/env-groups/${id}/secret-files/${encodeURIComponent(name)}`, { content }),
  deleteSecretFile: (id: string, name: string) =>
    render.delete(`/env-groups/${id}/secret-files/${encodeURIComponent(name)}`),
};

// ════════════════════════════════════════════════════════════
// DISKS
// ════════════════════════════════════════════════════════════
export const disks = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/disks', { ownerId, limit: 100 }).then(unwrap<Disk>),
  get: (id: string) => render.get<Disk>(`/disks/${id}`),
  create: (body: { name: string; sizeGB: number; mountPath: string; serviceId: string }) =>
    render.post<Disk>('/disks', body),
  update: (id: string, body: any) => render.patch(`/disks/${id}`, body),
  delete: (id: string) => render.delete(`/disks/${id}`),
  snapshots: (id: string) => render.get(`/disks/${id}/snapshots`),
  restoreSnapshot: (id: string, snapshotKey: string) => render.post(`/disks/${id}/snapshots/restore`, { snapshotKey }),
};

// ════════════════════════════════════════════════════════════
// REGISTRY CREDENTIALS
// ════════════════════════════════════════════════════════════
export const registry = {
  list: (ownerId?: string|string[]) =>
    render.get<any[]>('/registrycredentials', { ownerId, limit: 100 }).then(unwrap<RegistryCredential>),
  get: (id: string) => render.get<RegistryCredential>(`/registrycredentials/${id}`),
  create: (body: any) => render.post('/registrycredentials', body),
  update: (id: string, body: any) => render.patch(`/registrycredentials/${id}`, body),
  delete: (id: string) => render.delete(`/registrycredentials/${id}`),
};

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS (workspace notification settings)
// ════════════════════════════════════════════════════════════
export const notifications = {
  settings: (ownerId: string) => render.get(`/owners/${ownerId}/notification-settings`),
  update: (ownerId: string, body: any) => render.patch(`/owners/${ownerId}/notification-settings`, body),
  overrides: (ownerId: string) => render.get(`/owners/${ownerId}/notification-overrides`),
  setOverride: (ownerId: string, body: any) => render.post(`/owners/${ownerId}/notification-overrides`, body),
  deleteOverride: (ownerId: string, id: string) => render.delete(`/owners/${ownerId}/notification-overrides/${id}`),
};

// ════════════════════════════════════════════════════════════
// METRICS
// ════════════════════════════════════════════════════════════
export const metrics = {
  cpu:      (resource: string, opts: any = {}) => render.get('/metrics/cpu',           { resource, ...opts }),
  cpuLimit: (resource: string, opts: any = {}) => render.get('/metrics/cpu-limit',     { resource, ...opts }),
  memory:   (resource: string, opts: any = {}) => render.get('/metrics/memory',        { resource, ...opts }),
  memoryLimit: (resource: string, opts: any = {}) => render.get('/metrics/memory-limit',{ resource, ...opts }),
  httpRequests: (resource: string, opts: any = {}) => render.get('/metrics/http-requests', { resource, ...opts }),
  httpLatency: (resource: string, opts: any = {}) => render.get('/metrics/http-latency', { resource, ...opts }),
  instanceCount: (resource: string, opts: any = {}) => render.get('/metrics/instance-count', { resource, ...opts }),
  bandwidth: (resource: string, opts: any = {}) => render.get('/metrics/bandwidth', { resource, ...opts }),
  diskUsage: (resource: string, opts: any = {}) => render.get('/metrics/disk-usage', { resource, ...opts }),
  diskCapacity: (resource: string, opts: any = {}) => render.get('/metrics/disk-capacity', { resource, ...opts }),
  activeConnections: (resource: string, opts: any = {}) => render.get('/metrics/active-connections', { resource, ...opts }),
};
