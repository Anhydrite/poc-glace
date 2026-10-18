#!/usr/bin/env node
/**
 * Vérifie que les 10 assets vidéo attendus existent, sont décodables et
 * correspondent aux durées déclarées par les specs de scène.
 *
 *   node tests/assets.mjs
 *
 * On refuse volontairement les fichiers "placeholder" : ils sont détectés par
 * leur débit (un vrai rendu cinématique pèse plusieurs centaines de Ko par
 * seconde).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const EXPECTED = [
  { slug: '01-hublot-icebreaker', duration: 10 },
  { slug: '02-fenetre-tunnel', duration: 10 },
  { slug: '03-relique-explosee', duration: 5 },
  { slug: '04-gardien-glace', duration: 12 },
  { slug: '05-survol-glacier', duration: 6 },
];

function probe(file) {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames,r_frame_rate,codec_name', '-show_entries', 'format=duration,size,bit_rate', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const s = j.streams?.[0] || {};
    return { ...s, ...j.format };
  } catch {
    return null;
  }
}

let failures = 0;
const rows = [];

for (const { slug, duration } of EXPECTED) {
  for (const look of ['blocking', 'cinematic']) {
    const file = path.join(ROOT, 'assets', 'video', `${slug}-${look}.mp4`);
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(file)) {
      rows.push([rel, 'MANQUANT', '', '', '']);
      failures++;
      continue;
    }
    const info = probe(file);
    if (!info) {
      rows.push([rel, 'ILLISIBLE', '', '', '']);
      failures++;
      continue;
    }
    const d = Number(info.duration);
    const bitrate = Number(info.bit_rate || (Number(info.size) * 8) / Math.max(0.001, d));
    const kbps = Math.round(bitrate / 1000);
    const okDuration = Math.abs(d - duration) < 0.6;
    const okBitrate = kbps > 250; // un placeholder testsrc2 tombe bien plus bas
    const okCodec = info.codec_name === 'h264';
    const status = okDuration && okBitrate && okCodec ? 'ok' : 'SUSPECT';
    if (status !== 'ok') failures++;
    rows.push([rel, status, `${d.toFixed(2)}s`, `${info.width}×${info.height}`, `${kbps} kb/s`]);
  }
}

const w = [Math.max(...rows.map((r) => r[0].length)), 8, 8, 11, 12];
const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ');
console.log(line(['fichier', 'état', 'durée', 'taille', 'débit']));
console.log('-'.repeat(w.reduce((a, b) => a + b + 2, 0)));
rows.forEach((r) => console.log(line(r)));

const placeholderMarker = path.join(ROOT, 'assets', 'video', '.placeholder');
if (fs.existsSync(placeholderMarker)) {
  console.log('\n[assets] ✗ marqueur .placeholder présent : ce sont des vidéos de test, pas des rendus.');
  console.log('          relancez `node render/capture.mjs all` puis supprimez le marqueur.');
  failures++;
}

console.log('');
if (failures) {
  console.log(`[assets] ${failures} asset(s) problématique(s).`);
  process.exitCode = 1;
} else {
  console.log('[assets] les 10 vidéos sont présentes et conformes.');
}
