import { useCallback, useEffect, useRef } from 'react';
import { LiquidGlass } from 'apple-liquid-glass-webgl';

export type { LiquidGlass };

export interface GlassOpts {
  tint?: number;
  tintTone?: 'light' | 'dark' | 'auto';
  frost?: number;
  refraction?: number;
}

/**
 * Настоящее жидкое стекло (WebGL2-шейдер с рефракцией) на элемент.
 * Без WebGL2 либа сама откатывается на CSS backdrop-filter.
 * Возвращает null, если инициализация не удалась.
 */
export function glassify(
  el: HTMLElement,
  opts: GlassOpts = {},
): LiquidGlass | null {
  try {
    if (!LiquidGlass.isSupported()) return null;
    // live:false — никаких вечных перерисовок: линза одного стекла видит
    // канвасы других и считала бы их "живым" фоном (взаимо-ререндер каждый
    // кадр). Перерисовка идёт по факту: движение/скролл/ресайз помечают фон
    // грязным, анимацию линзы дока доводит refreshGlass().
    return new LiquidGlass(el, {
      tint: opts.tint ?? 0.5,
      tintTone: opts.tintTone ?? 'dark',
      frost: opts.frost ?? 0.12,
      material: { refraction: opts.refraction ?? 88, dispersion: 2.2 },
      live: false,
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

/**
 * React-хук: вешает настоящее WebGL-стекло на элемент по ref.
 * Callback-ref — стекло создаётся в момент монтирования DOM-узла,
 * поэтому работает и для условно рендерящихся элементов
 * (ранние return, шиты, FAB по табам).
 * Если WebGL2 недоступен — ставит класс `glass-off`, под который
 * в CSS прописан солидный фолбэк.
 */
export function useGlass<T extends HTMLElement = HTMLDivElement>(opts: GlassOpts = {}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const glassRef = useRef<LiquidGlass | null>(null);

  const ref = useCallback((el: T | null) => {
    if (glassRef.current) {
      try {
        glassRef.current.destroy();
      } catch {
        /* noop */
      }
      glassRef.current = null;
    }
    if (!el) return;
    el.classList.remove('glass-off');
    let g: LiquidGlass | null = null;
    try {
      g = glassify(el, optsRef.current);
    } catch {
      g = null;
    }
    if (g) glassRef.current = g;
    else el.classList.add('glass-off');
  }, []);

  // страховка на размонтирование компонента
  useEffect(
    () => () => {
      try {
        glassRef.current?.destroy();
      } catch {
        /* noop */
      }
      glassRef.current = null;
    },
    [],
  );

  return ref;
}
