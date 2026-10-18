#!/usr/bin/env node
/**
 * Génération des "prompts Seedance" seconde par seconde à partir des specs de
 * scène.
 *
 * Dans la vidéo de référence, c'est le modèle de langage qui rédige ce prompt en
 * regardant le playblast Blender. Ici, la même information est dérivée
 * mécaniquement des poses de caméra : c'est le même contrat, simplement écrit
 * plus bas dans la chaîne — ce qui garantit qu'il ne peut pas dériver du plan.
 *
 * Sorties :
 *   site/src/prompts.generated.js   (consommé par le site)
 *   docs/prompts-seedance.md        (documentation lisible)
 *   docs/camera-tables.md           (tableaux de poses)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const SLUGS = {
  '1': '01-hublot-icebreaker',
  '2': '02-fenetre-tunnel',
  '3': '03-relique-explosee',
  '4': '04-gardien-glace',
  '5': '05-survol-glacier',
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => Math.hypot(v[0], v[1], v[2]) || 1e-6;

const EASE_TEXT = {
  linear: 'vitesse constante',
  hold: 'pose tenue',
  smooth: 'départ et arrivée amortis',
  inQuad: 'départ lent',
  outQuad: 'arrivée douce',
  inOutQuad: 'départ lent, arrivée douce',
  inCubic: 'départ très lent, accélération marquée',
  outCubic: 'arrivée très amortie',
  inOutCubic: 'accélération puis freinage nets',
  outQuart: 'freinage long et cinématographique',
  inOutQuart: 'accélération franche puis freinage long',
  outQuint: 'freinage très long',
  inExpo: 'départ explosif depuis l’arrêt',
  outExpo: 'arrivée qui s’éteint progressivement',
  inOutExpo: 'départ explosif, arrivée qui s’éteint',
  inOutSine: 'mouvement sinusoïdal, sans à-coup',
  outBack: 'léger dépassement puis retour',
  inOutBack: 'dépassement à l’arrivée',
  inOutCirc: 'accélération circulaire',
  whip: 'balayage rapide puis stabilisation',
  dollyOut: 'poussée continue puis freinage',
};

/** Décrit un segment de caméra en langage de prompt vidéo. */
function describeSegment(a, b) {
  const dp = sub(b.pos, a.pos);
  const dt = sub(b.target, a.target);
  const dist = norm(sub(a.target, a.pos));
  const travel = norm(dp);
  const eps = Math.max(0.06, dist * 0.035);

  const moves = [];
  if (Math.abs(dp[2]) > eps) moves.push(dp[2] < 0 ? 'travelling avant' : 'travelling arrière');
  if (Math.abs(dp[0]) > eps) moves.push(dp[0] > 0 ? 'travelling latéral vers la droite' : 'travelling latéral vers la gauche');
  if (Math.abs(dp[1]) > eps) moves.push(dp[1] > 0 ? 'élévation de caméra (grue)' : 'descente de caméra');
  if (Math.abs(dt[0]) > eps) moves.push(dt[0] > 0 ? 'panoramique vers la droite' : 'panoramique vers la gauche');
  if (Math.abs(dt[1]) > eps) moves.push(dt[1] > 0 ? 'tilt vers le haut' : 'tilt vers le bas');

  const dfov = b.fov - a.fov;
  if (Math.abs(dfov) > 0.4) moves.push(dfov < 0 ? `resserrage de focale (${a.fov.toFixed(0)}° → ${b.fov.toFixed(0)}°)` : `ouverture de focale (${a.fov.toFixed(0)}° → ${b.fov.toFixed(0)}°)`);
  else moves.push(`focale stable (${b.fov.toFixed(0)}°)`);

  if (!moves.length) moves.push('micro-mouvement de maintien');

  const amp = travel > dist * 0.6 ? 'amplitude large' : travel > dist * 0.12 ? 'amplitude moyenne' : 'amplitude faible';
  return `${moves.join(', ')} — ${amp}, ${EASE_TEXT[a.ease] || a.ease || EASE_TEXT.smooth}`;
}

function buildPrompt(spec, beats, key) {
  const kfs = spec.camera.keyframes.map((k, i) => ({ ...k, t: k.t ?? i })).sort((x, y) => x.t - y.t);
  const slug = SLUGS[key];
  const lines = [];

  lines.push(`Plan cinématique, ${spec.duration.toFixed(1)} s, 16:9, 1080p, ${spec.fps} i/s.`);
  lines.push(`Sujet : ${spec.title} — ${spec.subtitle}.`);
  lines.push('');
  lines.push('MOUVEMENT DE CAMÉRA IMPOSÉ (à respecter image par image, ne rien réinventer) :');
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    lines.push(
      `  ${a.t.toFixed(1)} → ${b.t.toFixed(1)} s · ${describeSegment(a, b)}\n` +
        `      caméra ${fmt(a.pos)} → ${fmt(b.pos)} · visée ${fmt(a.target)} → ${fmt(b.target)}`,
    );
  }
  lines.push('');
  lines.push('REPÈRES NARRATIFS (chaque repère doit tomber à l’instant indiqué) :');
  for (const b of beats) lines.push(`  ${b.t.toFixed(1)} s · ${b.label} — ${b.text}`);
  lines.push('');
  lines.push('MATIÈRE / LUMIÈRE :');
  lines.push(`  ${matterText(spec.env)}`);
  lines.push('');
  lines.push('CONTRAINTES DE COMPOSITION :');
  lines.push('  — conserver le sujet dans la zone indiquée par chaque repère, jamais hors cadre ;');
  lines.push('  — garder les zones libres (tiers opposés) calmes et peu contrastées : du texte viendra s’y superposer ;');
  lines.push('  — aucun mouvement parasite de caméra : pas de caméra à l’épaule, pas de respiration, pas de reframe ;');
  lines.push('  — la première et la dernière image doivent être stables pendant au moins 4 images.');
  lines.push('');
  lines.push('RÉFÉRENCE DE BLOCKING :');
  lines.push(`  assets/video/${slug}-blocking.mp4 (passe blocking, ${Math.round(spec.duration * spec.fps)} images)`);
  lines.push(`  le mouvement de la référence est la source de vérité : le plan final doit s’y superposer.`);
  if (spec.reference) {
    lines.push('');
    lines.push(`CORRESPONDANCE : ${spec.reference}`);
  }
  return lines.join('\n');
}

function fmt(p) {
  return `(${p.map((v) => v.toFixed(2)).join(', ')})`;
}

function matterText(env) {
  switch (env) {
    case 'tundra':
      return 'ciel polaire très clair, blanc laiteux, contraste faible en fin de plan ; brume volumétrique dense ; cristaux de glace en suspension ; aucun objet chaud dans le cadre.';
    case 'studio':
      return 'fond sombre bleu nuit, éclairage produit latéral froid, reflets nets sur la glace, poussière de glace en suspension, halo lumineux derrière l’objet.';
    default:
      return 'heure bleue polaire : ciel nuit profond, horizon cyan pâle, aurores boréales vertes et violettes au fond, brume basse, glace vive très réfléchissante, neige fine continue.';
  }
}

async function loadScenes() {
  const mods = await Promise.all(
    ['1', '2', '3', '4', '5'].map((k) => import(path.join(ROOT, 'render', 'scenes', `concept-${k}.js`))),
  );
  return mods.map((m) => m.default);
}

function buildWhiteout(spec, key) {
  // La scene declare sa propre plage quand elle en a une : le site doit suivre
  // exactement le meme profil que la video, pas une approximation.
  if (Array.isArray(spec.whiteout) && spec.whiteout.length === 2) return spec.whiteout;
  if (key === '2') return [8.2, 9.0];
  return null;
}

export async function generate({ quiet = false } = {}) {
  const scenes = await loadScenes();
  const out = {};
  const docLines = ['# Prompts « Seedance » générés depuis les poses de caméra', ''];
  docLines.push(
    '> Dans la vidéo de référence, ces prompts sont rédigés par un modèle de langage qui **regarde le playblast**.',
    '> Ici ils sont dérivés mécaniquement des poses de caméra : le contrat est identique, mais il ne peut pas dériver du plan.',
    '',
  );

  scenes.forEach((spec, i) => {
    const key = String(i + 1);
    const beats = (spec.beats || []).map((b) => ({ t: b.t, label: b.label, text: b.text || '' }));
    const prompt = buildPrompt(spec, beats, key);
    out[key] = {
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle,
      reference: spec.reference,
      slug: SLUGS[key],
      duration: spec.duration,
      fps: spec.fps,
      poses: spec.camera.keyframes.length,
      frames: Math.round(spec.duration * spec.fps),
      env: spec.env,
      whiteout: buildWhiteout(spec, key),
      beats,
      camera: spec.camera.keyframes,
      prompt,
    };

    docLines.push(`## ${key} · ${spec.title}`, '', `*${spec.subtitle}*`, '');
    docLines.push(`- durée : **${spec.duration} s** · ${spec.fps} i/s · ${Math.round(spec.duration * spec.fps)} images`);
    docLines.push(`- poses de caméra : ${spec.camera.keyframes.length} · environnement : \`${spec.env}\``);
    if (spec.reference) docLines.push(`- correspondance : ${spec.reference}`);
    docLines.push('', '```text', prompt, '```', '');
  });

  const js = `/* Fichier généré par render/shot-list.mjs — ne pas éditer à la main. */\nexport const PROMPTS = ${JSON.stringify(out, null, 2)};\n`;
  fs.mkdirSync(path.join(ROOT, 'site', 'src'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'site', 'src', 'prompts.generated.js'), js);
  fs.writeFileSync(path.join(ROOT, 'docs', 'prompts-seedance.md'), docLines.join('\n'));
  if (!quiet) console.log(`[shot-list] ${Object.keys(out).length} prompts -> site/src/prompts.generated.js + docs/prompts-seedance.md`);
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await generate();
