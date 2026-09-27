import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WallpaperColorsResult {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

const WallpaperColors = registerPlugin<{
  getColors(): Promise<WallpaperColorsResult>;
}>('WallpaperColors');

/** Системный seed из цветов обоев (Android 8.1+). null — недоступно. */
export async function getSystemSeed(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const r = await WallpaperColors.getColors();
    return r.primary ?? null;
  } catch {
    return null;
  }
}
