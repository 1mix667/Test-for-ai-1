import { LiquidGlass } from 'apple-liquid-glass-webgl';

export type { LiquidGlass };

/**
 * Настоящее жидкое стекло (WebGL2-шейдер с рефракцией) на элемент.
 * Без WebGL2 либа сама откатывается на CSS backdrop-filter.
 * Возвращает null, если инициализация не удалась.
 */
export function glassify(
  el: HTMLElement,
  opts: {
    tint?: number;
    tintTone?: 'light' | 'dark' | 'auto';
    frost?: number;
    refraction?: number;
  } = {},
): LiquidGlass | null {
  try {
    if (!LiquidGlass.isSupported()) return null;
    return new LiquidGlass(el, {
      tint: opts.tint ?? 0.5,
      tintTone: opts.tintTone ?? 'dark',
      frost: opts.frost ?? 0.12,
      material: { refraction: opts.refraction ?? 88, dispersion: 2.2 },
      live: 'auto',
    });
  } catch {
    return null;
  }
}

/** Перерисовать всё стекло на следующем кадре (вызывать из анимаций). */
export function refreshGlass(): void {
  try {
    LiquidGlass.refreshAll();
  } catch {
    /* noop */
  }
}
