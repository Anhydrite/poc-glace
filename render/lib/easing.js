/**
 * Courbes d'acceleration pour les mouvements de camera.
 * Reprend volontairement le vocabulaire d'un logiciel d'animation (Blender /
 * After Effects) pour rester lisible quand on "block" une prise de vue.
 */
const c1 = 1.70158;
const c3 = c1 + 1;

export const EASING = {
  linear: (t) => t,
  hold: () => 0,
  smooth: (t) => t * t * (3 - 2 * t),
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  inOutBack: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c1 + 1) * 2 * t - c1)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c1 + 1) * (t * 2 - 2) + c1) + 2) / 2,
  inOutCirc: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  /** Whip pan : demarre vite puis se stabilise en douceur. */
  whip: (t) => 1 - Math.pow(1 - t, 2.4),
  /** Freinage cinematique (arrivee tres douce). */
  dollyOut: (t) => 1 - Math.pow(1 - t, 3.4),
};

export function ease(name, t) {
  const fn = EASING[name] || EASING.smooth;
  return fn(Math.max(0, Math.min(1, t)));
}

/** Lisse une suite de valeurs echantillonnees (filtre passe-bas). */
export function smoothSeries(values, passes = 1) {
  let out = values.slice();
  for (let p = 0; p < passes; p++) {
    const next = out.slice();
    for (let i = 1; i < out.length - 1; i++) {
      next[i] = (out[i - 1] + out[i] * 2 + out[i + 1]) / 4;
    }
    out = next;
  }
  return out;
}
