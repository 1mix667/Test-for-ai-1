import {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
} from '@material/material-color-utilities';
import { getSystemSeed } from './wallpaper';

/**
 * Monet: генерация тёмной M3-схемы из seed-цвета, как это делает Android.
 * Тональные палитры -> CSS-переменные --m3-*.
 * Схема TonalSpot — та, что ближе всего к системному Dynamic Color.
 */

export const DEFAULT_SEED = '#6750a4'; // каноничный M3 baseline purple

/** Специальное значение themeSeed: брать цвет из системных обоев */
export const SYSTEM_SEED = 'system';

export const SEED_PRESETS: { name: string; hex: string }[] = [
  { name: 'Фиолетовый', hex: '#6750a4' },
  { name: 'Синий', hex: '#1b6ef3' },
  { name: 'Голубой', hex: '#00838f' },
  { name: 'Зелёный', hex: '#2e7d32' },
  { name: 'Лайм', hex: '#5c8a00' },
  { name: 'Оранжевый', hex: '#c25e00' },
  { name: 'Красный', hex: '#c62828' },
  { name: 'Розовый', hex: '#c2185b' },
];

export function seedFromImageHue(_hex: string): string {
  return _hex;
}

export function monetVars(seedHex: string): Record<string, string> {
  let argb: number;
  try {
    argb = argbFromHex(seedHex);
  } catch {
    argb = argbFromHex(DEFAULT_SEED);
  }
  const hct = Hct.fromInt(argb);
  const s = new SchemeTonalSpot(hct, true, 0);
  const hx = (n: number) => hexFromArgb(n);
  return {
    '--m3-primary': hx(s.primary),
    '--m3-on-primary': hx(s.onPrimary),
    '--m3-primary-container': hx(s.primaryContainer),
    '--m3-on-primary-container': hx(s.onPrimaryContainer),
    '--m3-secondary': hx(s.secondary),
    '--m3-on-secondary': hx(s.onSecondary),
    '--m3-secondary-container': hx(s.secondaryContainer),
    '--m3-on-secondary-container': hx(s.onSecondaryContainer),
    '--m3-tertiary': hx(s.tertiary),
    '--m3-on-tertiary': hx(s.onTertiary),
    '--m3-tertiary-container': hx(s.tertiaryContainer),
    '--m3-on-tertiary-container': hx(s.onTertiaryContainer),
    '--m3-error': hx(s.error),
    '--m3-on-error': hx(s.onError),
    '--m3-error-container': hx(s.errorContainer),
    '--m3-on-error-container': hx(s.onErrorContainer),
    '--m3-surface': hx(s.surface),
    '--m3-on-surface': hx(s.onSurface),
    '--m3-surface-variant': hx(s.surfaceVariant),
    '--m3-on-surface-variant': hx(s.onSurfaceVariant),
    '--m3-surface-dim': hx(s.surfaceDim),
    '--m3-surface-bright': hx(s.surfaceBright),
    '--m3-surface-container-lowest': hx(s.surfaceContainerLowest),
    '--m3-surface-container-low': hx(s.surfaceContainerLow),
    '--m3-surface-container': hx(s.surfaceContainer),
    '--m3-surface-container-high': hx(s.surfaceContainerHigh),
    '--m3-surface-container-highest': hx(s.surfaceContainerHighest),
    '--m3-outline': hx(s.outline),
    '--m3-outline-variant': hx(s.outlineVariant),
    '--m3-inverse-surface': hx(s.inverseSurface),
    '--m3-inverse-on-surface': hx(s.inverseOnSurface),
    '--m3-inverse-primary': hx(s.inversePrimary),
    '--m3-scrim': hx(s.scrim),
  };
}

export function applyMonet(seedHex: string) {
  const vars = monetVars(seedHex);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

/** Резолвит themeSeed в hex: 'system' -> цвет обоев (async), иначе сам hex. */
export async function resolveSeed(seed: string | undefined): Promise<string> {
  const s = seed ?? SYSTEM_SEED;
  if (s !== SYSTEM_SEED) return s;
  return (await getSystemSeed()) ?? DEFAULT_SEED;
}
