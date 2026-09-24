// Генерация иконок и splash из resources/icon-full.png
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'resources/icon-full.png';
const RES = 'android/app/src/main/res';
const BG = { r: 0x0b, g: 0x0f, b: 0x14, alpha: 1 };

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const circleMask = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );

for (const [d, s] of Object.entries(densities)) {
  const dir = path.join(RES, `mipmap-${d}`);
  fs.mkdirSync(dir, { recursive: true });
  const icon = Math.round(48 * s);
  const fg = Math.round(108 * s);

  await sharp(SRC).resize(icon, icon).png().toFile(path.join(dir, 'ic_launcher.png'));

  await sharp(SRC)
    .resize(icon, icon)
    .composite([{ input: circleMask(icon), blend: 'dest-in' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_round.png'));

  // адаптивная иконка: логотип в безопасной зоне (66% от 108dp)
  const inner = Math.round(fg * 0.66);
  const logo = await sharp(SRC).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

fs.writeFileSync(
  path.join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0b0f14</color>\n</resources>\n`,
);

for (const f of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  const p = path.join(RES, 'mipmap-anydpi-v26', f);
  if (fs.existsSync(p))
    fs.writeFileSync(
      p,
      `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`,
    );
}

// у Capacitor есть векторный foreground, он конфликтует с нашим png
fs.rmSync(path.join(RES, 'drawable-v24/ic_launcher_foreground.xml'), { force: true });

// splash: тёмный фон с логотипом
const splashDirs = fs
  .readdirSync(RES)
  .filter((d) => d.startsWith('drawable') && fs.existsSync(path.join(RES, d, 'splash.png')));
for (const d of splashDirs) {
  const p = path.join(RES, d, 'splash.png');
  const meta = await sharp(p).metadata();
  const w = meta.width ?? 480;
  const h = meta.height ?? 320;
  const size = Math.round(Math.min(w, h) * 0.3);
  const logo = await sharp(SRC).resize(size, size).png().toBuffer();
  const out = await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(p, out);
}

console.log('Иконки и splash обновлены');
