import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import pwaColors from '../src/config/pwa-colors.json' with { type: 'json' };

const root = process.cwd();
const sourcePath = path.join(root, 'public/icons/logo.svg');
const outputDir = path.join(root, 'public/icons');
const sourceSvg = await readFile(sourcePath, 'utf8');
const originalLogo = Buffer.from(sourceSvg);

async function renderIcon({ fileName, size, background, logo, logoRatio }) {
  const logoSize = Math.round(size * logoRatio);
  const resizedLogo = await sharp(logo)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(outputDir, fileName));
}

await Promise.all([
  renderIcon({
    fileName: 'pwa-192.png',
    size: 192,
    background: pwaColors.background,
    logo: originalLogo,
    logoRatio: 0.62,
  }),
  renderIcon({
    fileName: 'pwa-512.png',
    size: 512,
    background: pwaColors.background,
    logo: originalLogo,
    logoRatio: 0.62,
  }),
  renderIcon({
    fileName: 'pwa-maskable-512.png',
    size: 512,
    background: pwaColors.background,
    logo: originalLogo,
    // A 50% glyph stays inside the 80% maskable safe zone on every edge.
    logoRatio: 0.5,
  }),
  renderIcon({
    fileName: 'apple-touch-icon.png',
    size: 180,
    background: pwaColors.background,
    logo: originalLogo,
    logoRatio: 0.62,
  }),
]);

console.log('Generated PWA icons from public/icons/logo.svg');
