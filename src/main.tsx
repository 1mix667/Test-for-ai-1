import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { Capacitor } from '@capacitor/core';
import { applyDefaultTheme } from './lib/theme';

// дефолтная тёмная Monet-тема сразу, без белой вспышки; точный seed применит App после загрузки настроек
applyDefaultTheme();

async function nativeSetup() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#121820' });
  } catch {}
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch {}
}
void nativeSetup();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
