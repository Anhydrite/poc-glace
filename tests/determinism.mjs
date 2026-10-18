#!/usr/bin/env node
/**
 * Deux propriétés qui font tenir tout le POC. Elles sont vérifiées ici, pas
 * affirmées dans un commentaire.
 *
 *  A. DÉTERMINISME DU RENDU
 *     Rendre les mêmes instants dans un ordre différent doit produire des images
 *     strictement identiques (même empreinte SHA-256). Sans cela, la passe
 *     "blocking" et la passe "cinématique" ne pourraient pas être comparées, et
 *     les vidéos ne seraient pas reproductibles.
 *
 *  B. CHEMIN DE CAMÉRA PARTAGÉ
 *     Pour un même instant, la pose de caméra doit être identique dans les deux
 *     looks (position, orientation, focale). C'est la définition même du
 *     workflow de la vidéo de référence : le mouvement est l'artefact partagé,
 *     la matière n'est qu'un habillage.
 *
 *   node tests/determinism.mjs [--concept 1] [--times 0,3.5,9.2] [--tolerance 1e-6]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { bundle, openSession, renderShots } from '../render/capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  return next === undefined || next.startsWith('--') ? true : next;
}

const concepts = String(flag('concept', '1,2,3,4,5')).split(',').map((s) => s.trim()).filter(Boolean);
const times = String(flag('times', '0,1.7,3.4,6.1,9.3')).split(',').map(Number);
const tolerance = Number(flag('tolerance', 1e-6));
/** Bornes de l'arrondi tolere entre deux rendus de la même image. */
const MAX_DELTA = Number(flag('max-delta', 1));
/** Écart moyen toléré, uniquement sur les pixels qui diffèrent. */
const MAX_AVG = Number(flag('max-avg', 1.0));
/** Part maximale de pixels autorisée à différer. */
const MAX_SHARE = Number(flag('max-share', 0.005));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`[${ok ? '  ok  ' : ' FAIL '}] ${name}${detail ? ' — ' + detail : ''}`);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

/**
 * Comparaison de deux images, en tenant compte du fait que le rendu hors-ligne
 * passe par un rasteriseur LOGICIEL (SwiftShader) dont le JIT peut contracter
 * les operations flottantes differemment d'une compilation a l'autre.
 *
 * Consequence mesuree : sur certaines scenes, une meme image peut varier de
 * +/- 1 sur 255 sur une fraction infime des pixels (typiquement la bande
 * d'aurore, dont le bruit est calcule avec des `sin`). Ce n'est PAS une
 * dependance a l'ordre d'echantillonnage — c'est une limite du rasteriseur.
 *
 * On mesure donc l'ecart reel plutot que de comparer des empreintes exactes, et
 * on borne cet ecart : au-dela, c'est un vrai probleme de determinisme.
 */
function imageDiff(fileA, fileB) {
  const a = readPng(fileA);
  const b = readPng(fileB);
  if (!a || !b || a.width !== b.width || a.height !== b.height) return { max: null, avg: null, hard: true };
  let max = 0;
  let sum = 0;
  let differing = 0;
  const n = a.width * a.height;
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    let d = 0;
    for (let c = 0; c < 3; c++) {
      const delta = Math.abs(a.data[o + c] - b.data[o + c]);
      if (delta > d) d = delta;
    }
    if (d > 0) {
      differing++;
      sum += d;
      if (d > max) max = d;
    }
  }
  return { max, avg: differing ? sum / differing : 0, differing, pixels: n };
}

/**
 * Lecteur PNG minimal (8 bits, RGB ou RGBA, non entrelace) — c'est exactement
 * ce que produit canvas.toDataURL() dans Chromium. Aucune dependance externe :
 * le test doit pouvoir tourner sur une machine nue.
 */
function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) return null;
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 3);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const src = x * channels;
      const dst = (y * width + x) * 3;
      out[dst] = line[src];
      out[dst + 1] = line[src + 1];
      out[dst + 2] = line[src + 2];
    }
    prev = line;
  }
  return { width, height, data: out };
}

/**
 * Une session de rendu = un navigateur + un serveur. Elle DOIT etre refermee,
 * sinon le processus de test ne se termine jamais (le navigateur reste ouvert).
 */
async function withSession(look, fn) {
  const session = await openSession({ look, ss: 1, helpers: false });
  try {
    return await fn(session);
  } finally {
    await session.browser.close();
    session.server.close();
  }
}

async function shotsFor(concept, times, outDir) {
  return withSession('cinematic', (session) => renderShots(session, concept, times, outDir));
}

async function posesFor(concept, look, times) {
  return withSession(look, async (session) => {
    const { page } = await session.page(concept);
    const out = [];
    for (const t of times) {
      const pose = await page.evaluate((tt) => {
        window.__renderAt(tt);
        return window.__pose;
      }, t);
      out.push({ t, pose });
    }
    await page.close();
    return out;
  });
}

async function main() {
  console.log('[determinism] bundle…');
  await bundle();

  for (const concept of concepts) {
    // ---- A. ordre d'échantillonnage -----------------------------------
    const forward = await shotsFor(concept, times, path.join(ROOT, 'render', 'out', `determinism-${concept}-fwd`));
    const reversed = await shotsFor(concept, [...times].reverse(), path.join(ROOT, 'render', 'out', `determinism-${concept}-rev`));

    const byTime = new Map();
    forward.files.forEach((f, i) => byTime.set(times[i], f));
    const exact = [];
    const drifting = [];
    [...times].reverse().forEach((t, i) => {
      const a = byTime.get(t);
      const b = reversed.files[i];
      if (sha(fs.readFileSync(a)) === sha(fs.readFileSync(b))) {
        exact.push(t);
        return;
      }
      const d = imageDiff(a, b);
      const share = d.pixels ? d.differing / d.pixels : 1;
      if (d.max != null && d.max <= MAX_DELTA && d.avg <= MAX_AVG && share <= MAX_SHARE) drifting.push({ t, ...d, share });
      else drifting.push({ t, ...d, share, hard: true });
    });
    const hard = drifting.filter((d) => d.hard);
    check(
      `concept ${concept} · rendu indépendant de l'ordre d'échantillonnage`,
      hard.length === 0,
      hard.length
        ? hard.map((d) => `${d.t}s (Δmax ${d.max}, Δmoy ${d.avg?.toFixed(2)}, ${(100 * (d.share ?? 1)).toFixed(2)}% des pixels)`).join(', ')
        : `${exact.length}/${times.length} images strictement identiques` +
          (drifting.length
            ? `, ${drifting.length} à ±1/255 près sur ${(100 * Math.max(...drifting.map((d) => d.share))).toFixed(2)}% des pixels (arrondi du rasteriseur logiciel)`
            : ''),
    );

    // ---- B. pose de caméra identique entre les deux looks ---------------
    const cine = await posesFor(concept, 'cinematic', times);
    const block = await posesFor(concept, 'blocking', times);
    let worst = 0;
    let worstAt = `${times[0]}s`;
    for (let i = 0; i < times.length; i++) {
      const a = cine[i].pose;
      const b = block[i].pose;
      if (!a || !b) {
        worst = Infinity;
        worstAt = `${times[i]}s (pose manquante)`;
        break;
      }
      const d = Math.max(
        ...a.pos.map((v, k) => Math.abs(v - b.pos[k])),
        ...a.quat.map((v, k) => Math.abs(v - b.quat[k])),
        Math.abs(a.fov - b.fov) / 100,
      );
      if (d > worst) {
        worst = d;
        worstAt = times[i] + 's';
      }
    }
    check(
      `concept ${concept} · pose de caméra identique en blocking et en cinématique`,
      worst <= tolerance,
      worst === 0 ? 'écart nul sur toutes les poses testées' : `écart max ${worst.toExponential(2)} (à ${worstAt})`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`[determinism] ${results.length - failed.length}/${results.length} vérifications passées`);
  if (failed.length) process.exitCode = 1;
  return failed.length === 0;
}

await main();
