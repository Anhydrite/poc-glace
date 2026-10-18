#!/usr/bin/env node
/**
 * Génération des médias du README (GIF + captures).
 *
 *   node tools/media.mjs [--only shots|gifs] [--width 1440]
 *
 * Tout est régénérable : le script reconstruit le site, ouvre une vraie page,
 * pilote le scroll et la poignée du comparateur, capture, puis encode.
 *
 * Sortie : docs/media/
 *   hero.jpg, comparateur.jpg, relique.jpg, gardien-droite.jpg,
 *   deploiement.jpg, workflow.jpg, mobile.jpg
 *   scroll-scrub.gif   (le scroll qui écrit le temps de la vidéo)
 *   comparateur.gif    (le balayage prévisualisation / final)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';
import { build } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MEDIA = path.join(ROOT, 'docs', 'media');
const TMP = path.join(ROOT, 'render', 'out', 'media');
const CHROME =
  process.env.POC_CHROME ||
  '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  return next === undefined || next.startsWith('--') ? true : next;
}

const only = String(flag('only', 'all'));
const W = Number(flag('width', 1440));
const H = Math.round((W * 9) / 16);

const log = (...a) => console.log('[media]', ...a);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} a échoué:\n${r.stderr || r.stdout}`);
  return r;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Pilote de page                                                      */
/* ------------------------------------------------------------------ */

async function openSite(browser, url, { width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`${url}/dist/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('window.__poc_ready === true', null, { timeout: 60000 });
  // Le scrub vidéo doit être réellement actif : sinon les médias ne montrent rien.
  await page.waitForFunction('window.__poc_scrub === true', null, { timeout: 60000 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  await sleep(1200);
  return { context, page };
}

/** Position de scroll pour (section, progression). */
async function targetFor(page, sectionId, progress) {
  return page.evaluate(
    ([id, p]) => {
      const el = document.getElementById(id);
      if (!el) return 0;
      const span = Math.max(1, el.offsetHeight - window.innerHeight);
      return Math.round(el.offsetTop + p * span);
    },
    [sectionId, progress],
  );
}

async function scrollTo(page, y) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y);
  // On laisse le moteur de scrub écrire le temps et la vidéo se décoder.
  await sleep(420);
}

/* ------------------------------------------------------------------ */
/* Captures fixes                                                      */
/* ------------------------------------------------------------------ */

const SHOTS = [
  ['hero', 'concept-1', 0.06],
  ['passage', 'concept-1', 0.5],
  ['monument', 'concept-1', 0.96],
  ['comparateur', 'compare', 0.55],
  ['fondu-blanc', 'concept-2', 0.99],
  ['relique', 'relique', 0.82],
  ['gardien-droite', 'gardien', 0.72],
  ['gardien-gauche', 'gardien', 0.99],
  ['deploiement', 'survol', 1],
];

async function shots(browser, url) {
  fs.mkdirSync(MEDIA, { recursive: true });
  const { context, page } = await openSite(browser, url, { width: W, height: H });
  try {
    for (const [name, section, progress] of SHOTS) {
      await scrollTo(page, await targetFor(page, section, progress));
      const file = path.join(MEDIA, `${name}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
      log(`${name}.jpg  ${(fs.statSync(file).size / 1024).toFixed(0)} Ko`);
    }

    // Vue bas de page (workflow + prompts + FAQ + footer)
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await sleep(600);
    await page.screenshot({ path: path.join(MEDIA, 'workflow.jpg'), type: 'jpeg', quality: 86 });
    log('workflow.jpg');

    // Comparateur à 50/50 (la couture au milieu : c'est l'image qui vend le POC)
    await scrollTo(page, await targetFor(page, 'compare', 0.55));
    await page.evaluate(() => window.__poc.compare.set(0.5));
    await sleep(500);
    await page.screenshot({ path: path.join(MEDIA, 'comparateur-50-50.jpg'), type: 'jpeg', quality: 90 });
    log('comparateur-50-50.jpg');

    // Mobile
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
    const mp = await m.newPage();
    await mp.goto(`${url}/dist/index.html`, { waitUntil: 'load' });
    await mp.waitForFunction('window.__poc_ready === true', null, { timeout: 60000 });
    await sleep(1500);
    await mp.screenshot({ path: path.join(MEDIA, 'mobile.jpg'), type: 'jpeg', quality: 88 });
    log('mobile.jpg');
    await m.close();
  } finally {
    await context.close();
  }
}

/* ------------------------------------------------------------------ */
/* GIF : le scroll écrit le temps de la vidéo                          */
/* ------------------------------------------------------------------ */

async function gifScroll(browser, url) {
  const dir = path.join(TMP, 'scroll');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const gw = 1280;
  const gh = 720;
  const { context, page } = await openSite(browser, url, { width: gw, height: gh });
  try {
    const start = await targetFor(page, 'concept-1', 0.0);
    const end = await targetFor(page, 'concept-1', 1.0);
    const frames = Number(flag('scroll-frames', 60));
    for (let i = 0; i < frames; i++) {
      // easeInOutSine : un scroll humain, pas une rampe linéaire.
      const u = i / (frames - 1);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(start + e * (end - start)));
      await sleep(170);
      await page.screenshot({ path: path.join(dir, `f_${String(i).padStart(4, '0')}.png`) });
    }
  } finally {
    await context.close();
  }
  encodeGif(dir, path.join(MEDIA, 'scroll-scrub.gif'), {
    fps: Number(flag('scroll-fps', 10)),
    width: Number(flag('scroll-width', 800)),
    colors: Number(flag('scroll-colors', 96)),
    dither: Number(flag('scroll-dither', 5)),
  });
  log('scroll-scrub.gif');
}

/* ------------------------------------------------------------------ */
/* GIF : balayage du comparateur                                       */
/* ------------------------------------------------------------------ */

async function gifCompare(browser, url) {
  const dir = path.join(TMP, 'compare');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const gw = 1280;
  const gh = 720;
  const { context, page } = await openSite(browser, url, { width: gw, height: gh });
  try {
    // On se place au milieu de la section comparateur et on laisse le scroll
    // avancer pendant que la poignée balaie : les deux mouvements se voient.
    const start = await targetFor(page, 'compare', 0.2);
    const end = await targetFor(page, 'compare', 0.8);
    const frames = Number(flag('compare-frames', 72));
    for (let i = 0; i < frames; i++) {
      const u = i / (frames - 1);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(start + u * (end - start)));
      // aller-retour triangulaire de la poignée
      const tri = u < 0.5 ? u * 2 : 2 - u * 2;
      await page.evaluate((s) => window.__poc.compare.set(s), 0.04 + tri * 0.92);
      await sleep(170);
      await page.screenshot({ path: path.join(dir, `f_${String(i).padStart(4, '0')}.png`) });
    }
  } finally {
    await context.close();
  }
  encodeGif(dir, path.join(MEDIA, 'comparateur.gif'), {
    fps: Number(flag('compare-fps', 11)),
    width: Number(flag('compare-width', 820)),
    colors: Number(flag('compare-colors', 112)),
    dither: Number(flag('compare-dither', 4)),
  });
  log('comparateur.gif');
}

/* ------------------------------------------------------------------ */
/* Encodage GIF (palette optimisée)                                    */
/* ------------------------------------------------------------------ */

function encodeGif(dir, outFile, { fps = 12, width = 900, colors = 128, dither = 4 } = {}) {
  const palette = path.join(dir, '_palette.png');
  const scale = `scale=${width}:-1:flags=lanczos`;
  // Un léger adoucissement aide beaucoup la quantification : les vidéos du site
  // sont grainées, et le grain est le pire ennemi d'un GIF.
  const pre = `${scale},gblur=sigma=0.4`;
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f_%04d.png'), '-vf', `${pre},palettegen=max_colors=${colors}:stats_mode=diff`, palette]);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-framerate', String(fps), '-i', path.join(dir, 'f_%04d.png'),
    '-i', palette,
    '-lavfi', `${pre} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=${dither}:diff_mode=rectangle`,
    '-loop', '0',
    outFile,
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
  log(`${path.basename(outFile)}  ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} Mo`);
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

async function main() {
  fs.mkdirSync(MEDIA, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  if (only === 'all' || only === 'build') {
    log('build du site…');
    await build({ minify: true });
  }

  const { server, url } = await startServer({ port: 0, root: ROOT });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  try {
    if (only === 'all' || only === 'shots') await shots(browser, url);
    if (only === 'all' || only === 'gifs') {
      await gifScroll(browser, url);
      await gifCompare(browser, url);
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  const total = fs
    .readdirSync(MEDIA)
    .reduce((n, f) => n + fs.statSync(path.join(MEDIA, f)).size, 0);
  log(`total docs/media : ${(total / 1024 / 1024).toFixed(2)} Mo`);
}

await main();
