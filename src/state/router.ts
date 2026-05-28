import { createContext, useContext } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'services' }
  | { name: 'service'; id: string }
  | { name: 'deploys'; serviceId: string }
  | { name: 'deploy'; serviceId: string; deployId: string }
  | { name: 'logs'; resource: string; resourceName?: string }
  | { name: 'env-vars'; serviceId: string }
  | { name: 'secret-files'; serviceId: string }
  | { name: 'domains'; serviceId: string }
  | { name: 'events'; serviceId: string }
  | { name: 'instances'; serviceId: string }
  | { name: 'jobs'; serviceId: string }
  | { name: 'metrics'; resource: string; resourceName?: string }
  | { name: 'create-service' }
  | { name: 'pings' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'env-groups' }
  | { name: 'env-group'; id: string }
  | { name: 'postgres-list' }
  | { name: 'postgres'; id: string }
  | { name: 'kv-list' }
  | { name: 'kv'; id: string }
  | { name: 'disks' }
  | { name: 'blueprints' }
  | { name: 'registry' }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'web-view'; url: string; title?: string };

export interface Router {
  current: Route;
  stack: Route[];
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => boolean;
  reset: (r: Route) => void;
}

export const RouterCtx = createContext<Router | null>(null);
export const useRouter = (): Router => {
  const v = useContext(RouterCtx);
  if (!v) throw new Error('useRouter() outside provider');
  return v;
};
