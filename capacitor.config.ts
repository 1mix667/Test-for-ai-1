import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anykey.chat',
  appName: 'AnyKey Chat',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0b0f14',
  },
  server: {
    androidScheme: 'https',
    // разрешаем http-адреса (локальные серверы, прокси без TLS)
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: { enabled: false },
    Keyboard: { resizeOnFullScreen: true },
  },
};

export default config;
