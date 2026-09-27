import React, { useEffect, useRef } from 'react';
import { IconChat, IconGear, IconKey } from './icons';
import { glassify, refreshGlass, useGlass, type LiquidGlass } from '../lib/liquid';

export type Tab = 'chats' | 'keys' | 'settings';

const TABS: { id: Tab; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: 'chats', label: 'Чаты', Icon: IconChat },
  { id: 'keys', label: 'Ключи', Icon: IconKey },
  { id: 'settings', label: 'Настройки', Icon: IconGear },
];

/** Лёгкий хаптик при переключении (только на нативе). */
function haptic() {
  void (async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* noop */
    }
  })();
}

/**
 * Нижний док: плавающая панель + жидкая стеклянная линза-пилюля,
 * которая пружиной перелетает между табами. Стекло — настоящий
 * WebGL2-шейдер с рефракцией (apple-liquid-glass-webgl).
 */
export default function Dock({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const dockGlass = useGlass<HTMLDivElement>({ tint: 0.34, frost: 0.3, refraction: 30 });
  const lensRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const glassRef = useRef<LiquidGlass | null>(null);
  const rafRef = useRef(0);
  const pressRef = useRef(false);
  // пружина: x — центр линзы, w — ширина
  const s = useRef({ x: 0, v: 0, tx: 0, w: 64, tw: 64, ready: false });

  const measure = (idx: number) => {
    const btn = btnRefs.current[idx];
    if (!btn) return null;
    return { cx: btn.offsetLeft + btn.offsetWidth / 2, w: btn.offsetWidth };
  };

  const paint = () => {
    const lens = lensRef.current;
    if (!lens) return;
    const st = s.current;
    const stretch = Math.min(0.28, Math.abs(st.v) / 4200);
    const press = pressRef.current ? 0.1 : 0;
    const sx = 1 + stretch + press;
    const sy = 1 - stretch * 0.55 + press;
    lens.style.width = `${st.w}px`;
    lens.style.transform = `translateX(${(st.x - st.w / 2).toFixed(2)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  };

  const tick = () => {
    const st = s.current;
    // пружина: жёсткость 300, демпфирование 25 — быстро с лёгким перелётом
    const k = 300;
    const d = 25;
    const dt = 1 / 60;
    const f = -k * (st.x - st.tx) - d * st.v;
    st.v += f * dt;
    st.x += st.v * dt;
    st.w += (st.tw - st.w) * 0.22;
    paint();
    refreshGlass();
    if (Math.abs(st.v) > 0.4 || Math.abs(st.x - st.tx) > 0.4 || Math.abs(st.w - st.tw) > 0.4) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      st.x = st.tx;
      st.v = 0;
      st.w = st.tw;
      paint();
      refreshGlass();
      rafRef.current = 0;
    }
  };

  const kick = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  // первичная инициализация: стекло + снап линзы под активный таб
  useEffect(() => {
    const lens = lensRef.current;
    if (lens) glassRef.current = glassify(lens, { tint: 0.4, frost: 0.3, refraction: 30 });
    const idx = TABS.findIndex((t) => t.id === tab);
    const m = measure(idx);
    if (m) {
      s.current.x = m.cx;
      s.current.tx = m.cx;
      s.current.w = m.w;
      s.current.tw = m.w;
      s.current.ready = true;
      paint();
    }
    const onResize = () => {
      const i = TABS.findIndex((t) => t.id === tabRef.current);
      const mm = measure(i);
      if (mm) {
        s.current.x = mm.cx;
        s.current.tx = mm.cx;
        s.current.w = mm.w;
        s.current.tw = mm.w;
        paint();
        refreshGlass();
      }
    };
    window.addEventListener('resize', onResize);
    // шрифты/раскладка могут приехать позже — переснять позицию
    const t = setTimeout(onResize, 400);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      glassRef.current?.destroy();
      glassRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  // смена таба — новая цель пружины
  useEffect(() => {
    if (!s.current.ready) return;
    const idx = TABS.findIndex((t) => t.id === tab);
    const m = measure(idx);
    if (m) {
      s.current.tx = m.cx;
      s.current.tw = m.w;
      kick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const press = (on: boolean) => {
    pressRef.current = on;
    kick();
  };

  return (
    <div className="dock-wrap">
      <div className="dock" ref={dockGlass} role="tablist" aria-label="Навигация">
        <div className="lens" ref={lensRef} aria-hidden />
        {TABS.map((t, i) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              role="tab"
              aria-selected={active}
              className={`dtab${active ? ' active' : ''}`}
              onClick={() => {
                if (t.id !== tabRef.current) {
                  haptic();
                  onTab(t.id);
                }
              }}
              onPointerDown={() => press(true)}
              onPointerUp={() => press(false)}
              onPointerLeave={() => press(false)}
              onPointerCancel={() => press(false)}
            >
              <t.Icon size={23} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
