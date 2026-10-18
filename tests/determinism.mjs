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

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`[${ok ? '  ok  ' : ' FAIL '}] ${name}${detail ? ' — ' + detail : ''}`);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

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
    forward.files.forEach((f, i) => byTime.set(times[i], sha(fs.readFileSync(f))));
    let mismatches = [];
    [...times].reverse().forEach((t, i) => {
      const h = sha(fs.readFileSync(reversed.files[i]));
      if (byTime.get(t) !== h) mismatches.push(`${t}s (${byTime.get(t)} vs ${h})`);
    });
    check(
      `concept ${concept} · rendu identique quel que soit l'ordre`,
      mismatches.length === 0,
      mismatches.length ? mismatches.join(', ') : `${times.length} instants × 2 ordres`,
    );

    // ---- B. pose de caméra identique entre les deux looks ---------------
    const cine = await posesFor(concept, 'cinematic', times);
    const block = await posesFor(concept, 'blocking', times);
    let worst = 0;
    let worstAt = null;
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
      `écart max ${worst.toExponential(2)} (à ${worstAt})`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log('');
  console.log(`[determinism] ${results.length - failed.length}/${results.length} vérifications passées`);
  if (failed.length) process.exitCode = 1;
  return failed.length === 0;
}

await main();
