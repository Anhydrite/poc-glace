/**
 * Rig de camera keyframe.
 *
 * C'est le coeur du "blocking" tel que decrit dans la video : on definit un
 * petit nombre de poses de camera (position, cible, focale, roll) avec une
 * courbe d'acceleration par segment, puis on echantillonne ce chemin image par
 * image. Le chemin est ensuite reutilise a l'identique par la passe
 * "cinematique" (l'equivalent du rendu Seedance 2.5) : seule la matiere change,
 * jamais le mouvement.
 *
 * Les tangentes sont calculees en differences finies (Catmull-Rom) pour obtenir
 * des mouvements de camera continus et cinematographiques (pas de cassure de
 * vitesse aux poses cles).
 */
import { ease } from './easing.js';

const V = (v) => ({ x: v[0] ?? 0, y: v[1] ?? 0, z: v[2] ?? 0 });

function catmullTangents(values) {
  // values: number[] correspondant a la composante d'une suite de poses
  const n = values.length;
  const m = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const prev = values[Math.max(0, i - 1)];
    const next = values[Math.min(n - 1, i + 1)];
    m[i] = (next - prev) / 2;
  }
  return m;
}

function hermite(p0, p1, m0, m1, u, dt) {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * p0 + h10 * m0 * dt + h01 * p1 + h11 * m1 * dt;
}

/**
 * @param {object} opts
 * @param {Array} opts.keyframes poses cles : { t (s), pos:[x,y,z], target?:[x,y,z], fov?, roll?, ease? }
 * @param {number} opts.duration duree totale en secondes
 * @param {number} [opts.fps]
 */
export function createCameraRig({ keyframes, duration, fps = 30 }) {
  if (!keyframes || keyframes.length < 2) throw new Error('createCameraRig: au moins 2 keyframes requis');
  const kfs = keyframes
    .map((k, i) => ({
      t: k.t ?? i,
      pos: k.pos,
      target: k.target || kfs0Target(keyframes),
      fov: k.fov ?? keyframes[0].fov ?? 35,
      roll: k.roll ?? 0,
      ease: k.ease || 'smooth',
    }))
    .sort((a, b) => a.t - b.t);

  const axis = (get) => {
    const vals = kfs.map(get);
    return { vals, tan: catmullTangents(vals) };
  };
  const px = axis((k) => k.pos[0]);
  const py = axis((k) => k.pos[1]);
  const pz = axis((k) => k.pos[2]);
  const tx = axis((k) => k.target[0]);
  const ty = axis((k) => k.target[1]);
  const tz = axis((k) => k.target[2]);
  const fovA = axis((k) => k.fov);
  const rollA = axis((k) => k.roll);

  function locate(time) {
    const t = Math.max(0, Math.min(duration, time));
    let i = 0;
    while (i < kfs.length - 2 && t > kfs[i + 1].t) i++;
    const a = kfs[i];
    const b = kfs[i + 1] || kfs[i];
    const span = Math.max(1e-6, b.t - a.t);
    const raw = Math.max(0, Math.min(1, (t - a.t) / span));
    const u = ease(a.ease, raw);
    return { i, u, raw, span, a, b };
  }

  const sample = (time) => {
    const { i, u, span } = locate(time);
    const pos = [
      hermite(px.vals[i], px.vals[i + 1], px.tan[i], px.tan[i + 1], u, span),
      hermite(py.vals[i], py.vals[i + 1], py.tan[i], py.tan[i + 1], u, span),
      hermite(pz.vals[i], pz.vals[i + 1], pz.tan[i], pz.tan[i + 1], u, span),
    ];
    const target = [
      hermite(tx.vals[i], tx.vals[i + 1], tx.tan[i], tx.tan[i + 1], u, span),
      hermite(ty.vals[i], ty.vals[i + 1], ty.tan[i], ty.tan[i + 1], u, span),
      hermite(tz.vals[i], tz.vals[i + 1], tz.tan[i], tz.tan[i + 1], u, span),
    ];
    const fov = fovA.vals[i] + (fovA.vals[i + 1] - fovA.vals[i]) * u;
    const roll = rollA.vals[i] + (rollA.vals[i + 1] - rollA.vals[i]) * u;
    return { pos, target, fov, roll };
  };

  /** Applique la pose echantillonnee a une THREE.PerspectiveCamera. */
  const apply = (camera, time, THREE) => {
    const s = sample(time);
    camera.position.set(s.pos[0], s.pos[1], s.pos[2]);
    camera.fov = s.fov;
    camera.up.set(0, 1, 0);
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
    if (s.roll) camera.rotateZ(s.roll);
    if (THREE) {
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }
    return s;
  };

  /** Trace du chemin de camera, pour l'affichage "previz" de la passe blocking. */
  const trajectory = (samples = 240) => {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const s = sample((i / samples) * duration);
      pts.push(s.pos);
    }
    return pts;
  };

  return { keyframes: kfs, duration, fps, sample, apply, trajectory, locate };
}

function kfs0Target(keyframes) {
  return keyframes[0].target || [0, 0, 0];
}

export const cameraRig = { create: createCameraRig, V };
