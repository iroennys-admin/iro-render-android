import { createContext, useContext } from 'react';
import type { Owner } from '../api/render';

export type Theme = 'render-dark' | 'midnight' | 'aurora' | 'cyber';

export interface PingEntry { name: string; url: string; enabled: boolean; }

export interface AppSettings {
  theme: Theme;
  fontSize: number;
  hapticFeedback: boolean;
  pingCronMinutes: number;     // minutes between pings (GitHub min 5)
  pingEntries: PingEntry[];
  pingGithubToken?: string;
  pingGithubLogin?: string;    // resolved automatically
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'render-dark',
  fontSize: 14,
  hapticFeedback: true,
  pingCronMinutes: 10,
  pingEntries: [],
};

export interface AppState {
  apiKey: string | null;
  ownerId: string | null;       // active workspace
  owners: Owner[];
  settings: AppSettings;
  setApiKey: (k: string | null) => void;
  setOwnerId: (id: string | null) => void;
  setOwners: (list: Owner[]) => void;
  updateSettings: (p: Partial<AppSettings>) => void;
  logout: () => void;
}

export const AppCtx = createContext<AppState | null>(null);
export const useApp = (): AppState => {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp() outside provider');
  return v;
};
