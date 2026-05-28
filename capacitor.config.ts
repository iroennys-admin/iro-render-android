import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.irorender.app',
  appName: 'IroRender',
  webDir: 'dist',
  server: { androidScheme: 'https', allowMixedContent: true, cleartext: true },
  android: { allowMixedContent: true, webContentsDebuggingEnabled: false },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#04121d', overlaysWebView: false },
    Keyboard:  { resize: 'native', resizeOnFullScreen: true },
  },
};

export default config;
