#!/usr/bin/env node
/**
 * Outil de diagnostic visuel : rend une grille de variantes d'isolation de
 * calques pour comprendre ce qui compose une image.
 *
 *   node render/diag.mjs --concept 1 --t 0 --hides "lightShafts,snowfall,cloudBank"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from '../tools/serve.mjs';
import { bundle, montage } from './capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.POC_CHROME || '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  return next === undefined || next.startsWith('--') ? true : next;
}

const concept = String(flag('concept', '1'));
const look = String(flag('look', 'cinematic'));
const times = String(flag('t', '0')).split(',').map(Number);
const hides = String(flag('hides', '')).split('|');

await bundle();
const { server, url } = await startServer({ port: 0, root: ROOT });
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const outDir = path.join(HERE, 'out', `diag-${concept}`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const files = [];
try {
  for (let h = 0; h < hides.length; h++) {
    const hide = hides[h].trim();
    for (const t of times) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      const q = new URLSearchParams({ concept, look, ss: '1', hide });
      await page.goto(`${url}/render/index.html?${q}`, { waitUntil: 'load' });
      await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
      await page.evaluate((tt) => window.__renderAt(tt), t);
      const dataUrl = await page.evaluate(() => window.__capture());
      const file = path.join(outDir, `h${h}_${hide.replace(/[^a-z0-9]+/gi, '-') || 'all'}_t${t}.png`);
      fs.writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      files.push(file);
      if (errs.length) console.log('[err]', hide, t, errs.join('|'));
      await page.close();
    }
  }
  const m = montage(files, path.join(outDir, '_montage.png'), { cols: Math.min(files.length, 3), tile: '640x360' });
  console.log('[ok]', path.relative(ROOT, m));
} finally {
  await browser.close();
  server.close();
}
