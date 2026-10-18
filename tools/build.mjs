#!/usr/bin/env node
/**
 * Build du site statique.
 *
 *   node tools/build.mjs [--watch]
 *
 * Etapes :
 *   1. bundle JS  site/src/main.js -> dist/assets/app.js (IIFE, minifie)
 *   2. bundle CSS site/src/styles.css -> dist/assets/app.css
 *   3. copie site/index.html -> dist/index.html
 *   4. copie assets/video/*.mp4 et assets/img/* -> dist/assets/...
 *   5. genere les posters manquants depuis la 1re image des MP4 (ffmpeg)
 *
 * Le site doit rester 100% hors-ligne : aucune ressource externe, aucune police
 * distante, aucune CDN.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITE = path.join(ROOT, 'site');
const DIST = path.join(ROOT, 'dist');
const ASSETS = path.join(ROOT, 'assets');

const watch = process.argv.includes('--watch');

const CONCEPTS = [
  { slug: '01-hublot-icebreaker' },
  { slug: '02-fenetre-tunnel' },
  { slug: '03-relique-explosee' },
  { slug: '04-gardien-glace' },
  { slug: '05-survol-glacier' },
];

function log(...a) {
  console.log('[build]', ...a);
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(from, to, filter = () => true) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (!filter(entry.name, src)) continue;
    if (entry.isDirectory()) n += copyDir(src, dst, filter);
    else {
      fs.copyFileSync(src, dst);
      n++;
    }
  }
  return n;
}

export function makePoster(mp4, jpg, at = '0.05') {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-ss', at, '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg], {
    encoding: 'utf8',
  });
  if (r.status !== 0) return false;
  return fs.existsSync(jpg);
}

export async function build({ minify = true } = {}) {
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

  const ctx = await esbuild.context({
    entryPoints: [path.join(SITE, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    target: ['chrome110', 'firefox110', 'safari16'],
    outfile: path.join(DIST, 'assets', 'app.js'),
    minify,
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'warning',
    metafile: true,
  });
  const res = await ctx.rebuild();
  if (watch) await ctx.watch();
  else await ctx.dispose();

  await esbuild.build({
    entryPoints: [path.join(SITE, 'src', 'styles.css')],
    bundle: true,
    outfile: path.join(DIST, 'assets', 'app.css'),
    minify,
    logLevel: 'warning',
  });

  // HTML
  let html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  html = html.replace(/\{\{BUILD_TIME\}\}/g, new Date().toISOString());
  fs.writeFileSync(path.join(DIST, 'index.html'), html);

  // Assets
  const nVideo = copyDir(path.join(ASSETS, 'video'), path.join(DIST, 'assets', 'video'), (name) => name.endsWith('.mp4') || name.endsWith('.webm'));
  const nImg = copyDir(path.join(ASSETS, 'img'), path.join(DIST, 'assets', 'img'));
  log(`copie ${nVideo} videos, ${nImg} images`);

  // Posters manquants
  const posterDir = path.join(DIST, 'assets', 'img');
  const srcPosterDir = path.join(ASSETS, 'img');
  fs.mkdirSync(srcPosterDir, { recursive: true });
  fs.mkdirSync(posterDir, { recursive: true });
  let made = 0;
  for (const c of CONCEPTS) {
    for (const look of ['cinematic', 'blocking']) {
      const mp4 = path.join(ASSETS, 'video', `${c.slug}-${look}.mp4`);
      const jpg = path.join(srcPosterDir, `${c.slug}-${look}.jpg`);
      if (!fs.existsSync(mp4) || fs.existsSync(jpg)) continue;
      if (makePoster(mp4, jpg, look === 'blocking' ? '1.0' : '0.35')) made++;
    }
  }
  if (made) {
    copyDir(srcPosterDir, posterDir, (name) => name.endsWith('.jpg'));
    log(`${made} posters generes`);
  }

  const sizes = listSizes(DIST);
  log(`dist: ${(sizes / 1024 / 1024).toFixed(1)} Mo`);
  if (res?.metafile) {
    const out = Object.entries(res.metafile.outputs).find(([k]) => k.endsWith('app.js'));
    if (out) log(`app.js: ${(out[1].bytes / 1024).toFixed(1)} Ko`);
  }
  return { sizes };
}

function listSizes(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += listSizes(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--clean')) rmrf(DIST);
  await build({ minify: !process.argv.includes('--no-minify') });
  if (watch) log('watch actif');
}
