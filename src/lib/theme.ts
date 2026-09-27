import { applyMonet, resolveSeed, DEFAULT_SEED } from './monet';

/** Применить тему из seed (hex или 'system'). */
export async function applyTheme(seed?: string): Promise<void> {
  try {
    applyMonet(await resolveSeed(seed));
  } catch {
    applyMonet(DEFAULT_SEED);
  }
}

/** Синхронный дефолт до загрузки настроек — чтобы не было белой вспышки. */
export function applyDefaultTheme(): void {
  try {
    applyMonet(DEFAULT_SEED);
  } catch {
    /* noop */
  }
}
