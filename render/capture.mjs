#!/usr/bin/env node
/**
 * Harness de rendu hors-ligne.
 *
 *   node render/capture.mjs shots --concept 1 --look cinematic --times 0,3,5,8,10
 *   node render/capture.mjs movie --concept 1 --look cinematic [--ss 1.25]
 *   node render/capture.mjs all
 *
 * Pipeline :
 *   1. esbuild bundle render/entry.js -> render/dist/render.js
 *   2. serveur statique local (avec support Range)
 *   3. Chromium headless (SwiftShader) -> rendu image par image, PNG en base64
 *   4. ffmpeg -> MP4 H.264 (GOP court + faststart => scrub fluide au scroll)
 *
 * Le rendu est deterministe : meme spec + meme look => meme sequence.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as esbuild from 'esbuild';
import { startServer } from '../tools/serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_ROOT = path.join(HERE, 'out');
const VIDEO_DIR = path.join(ROOT, 'assets', 'video');
const CHROME = process.env.POC_CHROME || '/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'movie';
function flag(name, fallback = undefined) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) return true;
  return next;
}

const CONCEPTS = {
  '1': { id: 'concept-1', slug: '01-hublot-icebreaker' },
  '2': { id: 'concept-2', slug: '02-fenetre-tunnel' },
  '3': { id: 'concept-3', slug: '03-relique-explosee' },
  '4': { id: 'concept-4', slug: '04-gardien-glace' },
  '5': { id: 'concept-5', slug: '05-survol-glacier' },
};

/* ------------------------------------------------------------------ */
/* Bundle                                                              */
/* ------------------------------------------------------------------ */

export async function bundle() {
  const outfile = path.join(HERE, 'dist', 'render.js');
  await esbuild.build({
    entryPoints: [path.join(HERE, 'entry.js')],
    bundle: true,
    format: 'iife',
    target: ['chrome120'],
    outfile,
    logLevel: 'warning',
    sourcemap: false,
    legalComments: 'none',
    minify: false,
  });
  return outfile;
}

/* ------------------------------------------------------------------ */
/* Session navigateur                                                  */
/* ------------------------------------------------------------------ */

export async function openSession({ look = 'cinematic', ss = 1, helpers = true } = {}) {
  const { server, port, url } = await startServer({ port: 0, root: ROOT });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-lcd-text',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
    ],
  });
  return {
    server,
    browser,
    url,
    port,
    async page(conceptKey) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const logs = [];
      p.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
      p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
      const query = new URLSearchParams({ concept: conceptKey, look, ss: String(ss), helpers: helpers ? '1' : '0' });
      await p.goto(`${url}/render/index.html?${query}`, { waitUntil: 'load' });
      await p.waitForFunction('window.__ready === true', null, { timeout: 120000 });
      const errors = await p.evaluate(() => window.__errors || []);
      if (errors.length) throw new Error('Erreurs de scene:\n' + errors.join('\n') + '\n' + logs.join('\n'));
      const meta = await p.evaluate(() => window.__meta);
      return { page: p, meta, logs };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Capture                                                             */
/* ------------------------------------------------------------------ */

export async function renderFrames(session, conceptKey, { frames = 'all', times = null, outDir, onProgress } = {}) {
  const { page, meta } = await session.page(conceptKey);
  fs.mkdirSync(outDir, { recursive: true });

  const indices = [];
  if (times) {
    for (const t of times) indices.push(Math.min(meta.frames - 1, Math.max(0, Math.round(t * meta.fps))));
  } else if (frames === 'all') {
    for (let i = 0; i < meta.frames; i++) indices.push(i);
  } else {
    const n = Number(frames);
    for (let i = 0; i < n; i++) indices.push(Math.round((i / Math.max(1, n - 1)) * (meta.frames - 1)));
  }

  const started = Date.now();
  let written = 0;
  for (const idx of indices) {
    const dataUrl = await page.evaluate((i) => window.__frameToDataUrl(i), idx);
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const file = path.join(outDir, `frame_${String(idx).padStart(5, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    written++;
    if (onProgress) onProgress(written, indices.length, idx);
  }
  const elapsed = (Date.now() - started) / 1000;
  await page.close();
  return { meta, indices, elapsed, written };
}

export async function renderShots(session, conceptKey, times, outDir) {
  const { page, meta } = await session.page(conceptKey);
  fs.mkdirSync(outDir, { recursive: true });
  const files = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    await page.evaluate((tt) => window.__renderAt(tt), t);
    const dataUrl = await page.evaluate(() => window.__capture());
    const file = path.join(outDir, `shot_${String(i).padStart(2, '0')}_t${t.toFixed(2)}s.png`);
    fs.writeFileSync(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    files.push(file);
  }
  await page.close();
  return { meta, files };
}

/* ------------------------------------------------------------------ */
/* Encodage                                                            */
/* ------------------------------------------------------------------ */

export function encodeMp4({ pattern, outFile, fps = 30, scale = null, crf = 21, gop = 8, preset = 'slow' }) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-framerate',
    String(fps),
    '-i',
    pattern,
  ];
  const filters = [];
  if (scale) filters.push(`scale=${scale}:flags=lanczos`);
  if (filters.length) args.push('-vf', filters.join(','));
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    preset,
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
    '-movflags',
    '+faststart',
    '-an',
    outFile,
  );
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg a echoue:\n' + r.stderr);
  return outFile;
}

export function montage(files, outFile, { cols = null, tile = '480x270' } = {}) {
  const n = files.length;
  if (n === 1) {
    const r = spawnSync('ffmpeg', ['-y','-hide_banner','-loglevel','error','-i', files[0], '-vf', `scale=${tile}`, outFile], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg montage a echoue:\n' + r.stderr);
    return outFile;
  }
  const c = cols || Math.min(n, 4);
  const rows = Math.ceil(n / c);
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex',
    `${files.map((_, i) => `[${i}:v]scale=${tile},setsar=1[v${i}]`).join(';')};${files
      .map((_, i) => `[v${i}]`)
      .join('')}xstack=inputs=${n}:layout=${layout(c, rows, tileSize(tile).w, tileSize(tile).h)}:fill=black`,
    '-frames:v',
    '1',
    outFile,
  ];
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg montage a echoue:\n' + r.stderr);
  return outFile;
}

function layout(cols, rows, tw, th) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push(`${c * tw}_${r * th}`);
  }
  return cells.join('|');
}

function tileSize(tile) {
  const m = /^(\d+)x(\d+)$/.exec(String(tile));
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 480, h: 270 };
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

async function runMovie(conceptKey, look, opts = {}) {
  const info = CONCEPTS[conceptKey];
  const ss = Number(opts.ss ?? flag('ss', 1.25));
  const outDir = path.join(OUT_ROOT, `${info.slug}-${look}`);
  fs.rmSync(outDir, { recursive: true, force: true });

  const bundleStarted = Date.now();
  await bundle();
  console.log(`[bundle] ${(Date.now() - bundleStarted) / 1000}s`);

  const session = await openSession({ look, ss, helpers: opts.helpers ?? false });
  try {
    console.log(`[render] ${info.slug} / ${look} / ss=${ss}`);
    const t0 = Date.now();
    const res = await renderFrames(session, conceptKey, {
      frames: 'all',
      outDir,
      onProgress: (done, total) => {
        if (done % 30 === 0 || done === total) {
          const secs = (Date.now() - t0) / 1000;
          process.stdout.write(`  ${done}/${total} images (${(done / Math.max(0.001, secs)).toFixed(1)} img/s)\r`);
        }
      },
    });
    process.stdout.write('\n');
    const baseW = res.meta.baseWidth;
    const baseH = res.meta.baseHeight;
    const outFile = path.join(VIDEO_DIR, `${info.slug}-${look}.mp4`);
    const t1 = Date.now();
    encodeMp4({
      pattern: path.join(outDir, 'frame_%05d.png'),
      outFile,
      fps: res.meta.fps,
      scale: `${baseW}:${baseH}`,
      crf: look === 'blocking' ? 18 : 22,
      gop: Math.max(4, Math.round(res.meta.fps / 4)),
      preset: 'slow',
    });
    const stat = fs.statSync(outFile);
    console.log(
      `[ok] ${path.relative(ROOT, outFile)}  ${(stat.size / 1024 / 1024).toFixed(2)} Mo  ` +
        `(rendu ${res.elapsed.toFixed(1)}s, encodage ${((Date.now() - t1) / 1000).toFixed(1)}s)`,
    );
    return outFile;
  } finally {
    await session.browser.close();
    session.server.close();
  }
}

async function runShots(conceptKey, look, times, opts = {}) {
  const info = CONCEPTS[conceptKey];
  const ss = Number(opts.ss ?? flag('ss', 1));
  const outDir = path.join(OUT_ROOT, `shots-${info.slug}-${look}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  await bundle();
  const session = await openSession({ look, ss, helpers: opts.helpers ?? false });
  try {
    const { files } = await renderShots(session, conceptKey, times, outDir);
    const montageFile = path.join(outDir, '_montage.png');
    montage(files, montageFile, { cols: Math.min(files.length, 3), tile: '640x360' });
    console.log(`[ok] ${files.length} captures -> ${path.relative(ROOT, montageFile)}`);
    return montageFile;
  } finally {
    await session.browser.close();
    session.server.close();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const look = flag('look', 'cinematic');
  const times = String(flag('times', '0,1,2.9,4.6,7.3,10')).split(',').map(Number);
  if (command === 'shots') {
    const concept = String(flag('concept', '1'));
    await runShots(concept, look, times);
  } else if (command === 'movie') {
    const concept = String(flag('concept', '1'));
    await runMovie(concept, look);
  } else if (command === 'all') {
    const only = flag('concept', null);
    const looks = String(flag('looks', 'blocking,cinematic')).split(',');
    const keys = only ? [String(only)] : Object.keys(CONCEPTS);
    for (const k of keys) {
      for (const l of looks) await runMovie(k, l);
    }
  } else {
    console.error('commandes: shots | movie | all');
    process.exit(1);
  }
}
