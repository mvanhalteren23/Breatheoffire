import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bof2.rekindled',
  appName: 'Breath of Fire II: Rekindled',
  webDir: 'dist',
  backgroundColor: '#0a101d',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
  },
  android: {
    backgroundColor: '#0a101d',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0a101d',
    },
  },
};

export default config;
