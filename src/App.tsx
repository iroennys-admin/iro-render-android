import React, { useEffect, useMemo, useState } from 'react';
import { AppCtx, DEFAULT_SETTINGS, type AppSettings } from './state/store';
import { RouterCtx, type Route, type Router } from './state/router';
import { render } from './api/client';
import { owners as ownersApi, type Owner } from './api/render';

import ToastHost, { toast } from './ui/Toast';
import LoginScreen from './pages/LoginScreen';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ServicePage from './pages/ServicePage';
import DeploysPage from './pages/DeploysPage';
import DeployDetailPage from './pages/DeployDetailPage';
import LogsPage from './pages/LogsPage';
import EnvVarsPage from './pages/EnvVarsPage';
import SecretFilesPage from './pages/SecretFilesPage';
import DomainsPage from './pages/DomainsPage';
import EventsPage from './pages/EventsPage';
import InstancesPage from './pages/InstancesPage';
import JobsPage from './pages/JobsPage';
import MetricsPage from './pages/MetricsPage';
import CreateServicePage from './pages/CreateServicePage';
import PingsPage from './pages/PingsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import EnvGroupsPage from './pages/EnvGroupsPage';
import EnvGroupDetailPage from './pages/EnvGroupDetailPage';
import PostgresListPage from './pages/PostgresListPage';
import PostgresDetailPage from './pages/PostgresDetailPage';
import KVListPage from './pages/KVListPage';
import KVDetailPage from './pages/KVDetailPage';
import DisksPage from './pages/DisksPage';
import BlueprintsPage from './pages/BlueprintsPage';
import RegistryPage from './pages/RegistryPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import WebViewPage from './pages/WebViewPage';

const KEY_API = 'iro_api_key';
const KEY_OWNER = 'iro_owner_id';
const KEY_OWNERS = 'iro_owners';
const KEY_SETTINGS = 'iro_settings';

function loadJson<T>(k: string, fb: T): T { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function saveJson(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export default function App() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => localStorage.getItem(KEY_API));
  const [ownerId, setOwnerIdState] = useState<string | null>(() => localStorage.getItem(KEY_OWNER));
  const [owners, setOwnersState] = useState<Owner[]>(() => loadJson(KEY_OWNERS, []));
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadJson(KEY_SETTINGS, {}) }));
  const [stack, setStack] = useState<Route[]>([{ name: apiKey ? 'home' : 'login' }]);

  useEffect(() => {
    if (apiKey) { localStorage.setItem(KEY_API, apiKey); render.setToken(apiKey); }
    else { localStorage.removeItem(KEY_API); render.setToken(null); }
  }, [apiKey]);
  useEffect(() => { if (ownerId) localStorage.setItem(KEY_OWNER, ownerId); else localStorage.removeItem(KEY_OWNER); }, [ownerId]);
  useEffect(() => { saveJson(KEY_OWNERS, owners); }, [owners]);
  useEffect(() => { saveJson(KEY_SETTINGS, settings); }, [settings]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', settings.theme); }, [settings.theme]);
  useEffect(() => { document.body.style.fontSize = `${settings.fontSize}px`; }, [settings.fontSize]);

  // On token change, fetch owners
  useEffect(() => {
    if (!apiKey) return;
    render.setToken(apiKey);
    ownersApi.list()
      .then((list) => {
        setOwnersState(list);
        if (!ownerId || !list.find(o => o.id === ownerId)) {
          setOwnerIdState(list[0]?.id || null);
        }
      })
      .catch(err => {
        if (err?.status === 401) { toast.error('API key inválida'); setApiKeyState(null); }
        else toast.error(err?.message || 'Error');
      });
  }, [apiKey]);

  // Hardware back
  useEffect(() => {
    const handler = (e: PopStateEvent) => { e.preventDefault?.(); router.back(); window.history.pushState(null, '', ''); };
    window.history.pushState(null, '', '');
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [stack]);

  const router: Router = useMemo(() => ({
    get current() { return stack[stack.length - 1]; },
    stack,
    push: (r) => setStack(s => [...s, r]),
    replace: (r) => setStack(s => [...s.slice(0, -1), r]),
    back: () => {
      let popped = false;
      setStack(s => { if (s.length > 1) { popped = true; return s.slice(0, -1); } return s; });
      return popped;
    },
    reset: (r) => setStack([r]),
  }), [stack]);

  const ctx = useMemo(() => ({
    apiKey, ownerId, owners, settings,
    setApiKey: (k: string | null) => { setApiKeyState(k); if (k) router.reset({ name: 'home' }); else router.reset({ name: 'login' }); },
    setOwnerId: setOwnerIdState,
    setOwners: setOwnersState,
    updateSettings: (p: Partial<AppSettings>) => setSettings(s => ({ ...s, ...p })),
    logout: () => { setApiKeyState(null); setOwnerIdState(null); setOwnersState([]); router.reset({ name: 'login' }); toast.info('Sesión cerrada'); },
  }), [apiKey, ownerId, owners, settings, router]);

  const current = stack[stack.length - 1];
  const showNav = !!apiKey && ['home','services','pings','settings'].includes(current.name);

  return (
    <AppCtx.Provider value={ctx as any}>
      <RouterCtx.Provider value={router}>
        <div className="app" data-theme={settings.theme}>
          <div className="main">
            {!apiKey ? <LoginScreen /> : renderPage(current)}
          </div>
          {showNav && <BottomNav current={current} push={router.push} />}
          <ToastHost />
        </div>
      </RouterCtx.Provider>
    </AppCtx.Provider>
  );
}

function renderPage(r: Route): React.ReactNode {
  switch (r.name) {
    case 'login': return <LoginScreen />;
    case 'home': return <HomePage />;
    case 'services': return <ServicesPage />;
    case 'service': return <ServicePage id={r.id} />;
    case 'deploys': return <DeploysPage serviceId={r.serviceId} />;
    case 'deploy': return <DeployDetailPage serviceId={r.serviceId} deployId={r.deployId} />;
    case 'logs': return <LogsPage resource={r.resource} resourceName={r.resourceName} />;
    case 'env-vars': return <EnvVarsPage serviceId={r.serviceId} />;
    case 'secret-files': return <SecretFilesPage serviceId={r.serviceId} />;
    case 'domains': return <DomainsPage serviceId={r.serviceId} />;
    case 'events': return <EventsPage serviceId={r.serviceId} />;
    case 'instances': return <InstancesPage serviceId={r.serviceId} />;
    case 'jobs': return <JobsPage serviceId={r.serviceId} />;
    case 'metrics': return <MetricsPage resource={r.resource} resourceName={r.resourceName} />;
    case 'create-service': return <CreateServicePage />;
    case 'pings': return <PingsPage />;
    case 'projects': return <ProjectsPage />;
    case 'project': return <ProjectDetailPage id={r.id} />;
    case 'env-groups': return <EnvGroupsPage />;
    case 'env-group': return <EnvGroupDetailPage id={r.id} />;
    case 'postgres-list': return <PostgresListPage />;
    case 'postgres': return <PostgresDetailPage id={r.id} />;
    case 'kv-list': return <KVListPage />;
    case 'kv': return <KVDetailPage id={r.id} />;
    case 'disks': return <DisksPage />;
    case 'blueprints': return <BlueprintsPage />;
    case 'registry': return <RegistryPage />;
    case 'settings': return <SettingsPage />;
    case 'about': return <AboutPage />;
    case 'web-view': return <WebViewPage url={r.url} title={r.title} />;
  }
}

function BottomNav({ current, push }: { current: Route; push: (r: Route) => void }) {
  const items: { name: Route['name']; label: string; icon: string; route: Route }[] = [
    { name: 'home',      label: 'Home',     icon: '🏠', route: { name: 'home' } },
    { name: 'services',  label: 'Services', icon: '📦', route: { name: 'services' } },
    { name: 'pings',     label: 'Pings',    icon: '🔔', route: { name: 'pings' } },
    { name: 'settings',  label: 'Settings', icon: '⚙️', route: { name: 'settings' } },
  ];
  // Add a 5th button: "+ Deploy"
  const all = [
    items[0], items[1],
    { name: 'create-service' as any, label: 'Deploy', icon: '➕', route: { name: 'create-service' } as Route },
    items[2], items[3],
  ];
  return (
    <nav className="bottom-nav">
      {all.map(it => (
        <button key={it.name} className={current.name === it.name ? 'active' : ''} onClick={() => push(it.route)}>
          <span className="ico">{it.icon}</span>{it.label}
        </button>
      ))}
    </nav>
  );
}
